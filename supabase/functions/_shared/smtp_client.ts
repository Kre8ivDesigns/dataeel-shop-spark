/**
 * Low-level SMTP (AUTH PLAIN, STARTTLS / 465) for Edge Functions.
 * Used by manage-app-settings (test mail) and notify-admin-new-signup.
 */
export type SmtpConnectionOptions = {
  host: string;
  port: number;
  user: string;
  password: string;
  fromAddress: string;
  fromName: string;
  replyTo: string;
  to: string;
};

export type SmtpSendMailOptions = SmtpConnectionOptions & {
  subject: string;
  textBody: string;
};

type SmtpConn = Deno.TcpConn | Deno.TlsConn;

/** Read a full SMTP response (may be multiline, ends on "NNN <text>\r\n"). */
export async function smtpRead(conn: SmtpConn): Promise<string> {
  const dec = new TextDecoder();
  let buf = "";
  const chunk = new Uint8Array(4096);
  while (true) {
    const n = await conn.read(chunk);
    if (n === null) break;
    buf += dec.decode(chunk.subarray(0, n));
    if (/^\d{3} /m.test(buf) && buf.endsWith("\r\n")) break;
    if (/^\d{3} .+/.test(buf.trim())) break;
  }
  return buf;
}

export async function smtpWrite(conn: SmtpConn, line: string): Promise<void> {
  await conn.write(new TextEncoder().encode(line + "\r\n"));
}

export function smtpCode(resp: string): number {
  return parseInt(resp.slice(0, 3), 10);
}

function sanitizeHeaderValue(s: string): string {
  return s.replace(/[\r\n]/g, " ").trim();
}

/** Send a single plain-text email over SMTP. */
export async function smtpSendMail(opts: SmtpSendMailOptions): Promise<void> {
  const { host, port, user, password, fromAddress, fromName, replyTo, to, subject, textBody } = opts;
  const useDirectTls = port === 465;

  let conn: SmtpConn = useDirectTls
    ? await Deno.connectTls({ hostname: host, port })
    : await Deno.connect({ hostname: host, port });

  try {
    const greeting = await smtpRead(conn);
    if (smtpCode(greeting) !== 220) throw new Error(`Unexpected greeting: ${greeting.slice(0, 80)}`);

    await smtpWrite(conn, "EHLO dataeel-smtp.client");
    const ehloResp = await smtpRead(conn);
    if (smtpCode(ehloResp) !== 250) throw new Error(`EHLO failed: ${ehloResp.slice(0, 80)}`);

    if (!useDirectTls) {
      if (!ehloResp.toUpperCase().includes("STARTTLS")) {
        throw new Error("SMTP server does not advertise STARTTLS");
      }
      await smtpWrite(conn, "STARTTLS");
      const tlsResp = await smtpRead(conn);
      if (smtpCode(tlsResp) !== 220) throw new Error(`STARTTLS failed: ${tlsResp.slice(0, 80)}`);

      conn = await Deno.startTls(conn as Deno.TcpConn, { hostname: host });

      await smtpWrite(conn, "EHLO dataeel-smtp.client");
      const ehlo2 = await smtpRead(conn);
      if (smtpCode(ehlo2) !== 250) throw new Error(`EHLO after STARTTLS failed: ${ehlo2.slice(0, 80)}`);
    }

    const authStr = `\0${user}\0${password}`;
    const authB64 = btoa(unescape(encodeURIComponent(authStr)));
    await smtpWrite(conn, `AUTH PLAIN ${authB64}`);
    const authResp = await smtpRead(conn);
    if (smtpCode(authResp) !== 235) throw new Error(`Authentication failed: ${authResp.slice(0, 120)}`);

    await smtpWrite(conn, `MAIL FROM:<${fromAddress}>`);
    const fromResp = await smtpRead(conn);
    if (smtpCode(fromResp) !== 250) throw new Error(`MAIL FROM rejected: ${fromResp.slice(0, 80)}`);

    await smtpWrite(conn, `RCPT TO:<${to}>`);
    const rcptResp = await smtpRead(conn);
    if (smtpCode(rcptResp) !== 250) throw new Error(`RCPT TO rejected: ${rcptResp.slice(0, 80)}`);

    await smtpWrite(conn, "DATA");
    const dataResp = await smtpRead(conn);
    if (smtpCode(dataResp) !== 354) throw new Error(`DATA rejected: ${dataResp.slice(0, 80)}`);

    const date = new Date().toUTCString();
    const safeFromName = sanitizeHeaderValue(fromName);
    const safeReplyTo = sanitizeHeaderValue(replyTo);
    const safeSubject = sanitizeHeaderValue(subject);
    const lines: string[] = [
      `From: "${safeFromName}" <${fromAddress}>`,
      `To: ${to}`,
      `Subject: ${safeSubject}`,
      `Date: ${date}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/plain; charset=UTF-8`,
    ];
    if (safeReplyTo) lines.push(`Reply-To: ${safeReplyTo}`);
    lines.push("", textBody.replace(/\r\n/g, "\n").split("\n").join("\r\n"));

    const body = lines.join("\r\n") + "\r\n.\r\n";
    await conn.write(new TextEncoder().encode(body));
    const sentResp = await smtpRead(conn);
    if (smtpCode(sentResp) !== 250) throw new Error(`Message rejected: ${sentResp.slice(0, 80)}`);

    await smtpWrite(conn, "QUIT");
  } finally {
    try {
      conn.close();
    } catch {
      /* ignore */
    }
  }
}

/** Preset copy for the admin “test SMTP” action in manage-app-settings. */
export async function smtpSendSmtpTestMail(opts: SmtpConnectionOptions): Promise<void> {
  return smtpSendMail({
    ...opts,
    subject: "SMTP Test — DATAEEL Admin",
    textBody: "This is a test email from your DATAEEL admin panel.\nYour SMTP configuration is working correctly!",
  });
}
