import type { PrivacySection } from "./types";

export const PRIVACY_SECTION_US: PrivacySection[] = [
  {
    id: "do-united-states-residents-have-specific-privacy-rights",
    num: 11,
    title: "DO UNITED STATES RESIDENTS HAVE SPECIFIC PRIVACY RIGHTS?",
    blocks: [
      {
        type: "p",
        text: "In Short: If you are a resident of California, Colorado, Connecticut, Utah, or Virginia, you are granted specific rights regarding access to your personal information.",
      },
      { type: "h3", text: "What categories of personal information do we collect?" },
      {
        type: "p",
        text: "We may collect the following categories of personal information:",
      },
      {
        type: "table",
        headers: ["Category", "Examples", "Collected"],
        rows: [
          [
            "A. Identifiers",
            "Contact details such as real name, alias, postal address, telephone or mobile contact number, unique personal identifier, online identifier, Internet Protocol address, email address, and account name",
            "Yes",
          ],
          [
            "B. Personal information as defined in the California Customer Records statute",
            "Name, contact information, education, employment, employment history, and financial information",
            "Yes",
          ],
          [
            "C. Protected classification characteristics under state or federal law",
            "Gender and date of birth",
            "Yes",
          ],
          [
            "D. Commercial information",
            "Transaction information, purchase history, financial details, and payment information",
            "Yes",
          ],
          ["E. Biometric information", "Fingerprints and voiceprints", "No"],
          [
            "F. Internet or other similar network activity",
            "Browsing history, search history, online behavior, interest data, and interactions with our and other websites, applications, systems, and advertisements",
            "Yes",
          ],
          ["G. Geolocation data", "Device location", "Yes"],
          [
            "H. Audio, electronic, visual, thermal, or similar information",
            "Images and audio, video or call recordings created in connection with our business activities",
            "Yes",
          ],
          [
            "I. Professional or employment-related information",
            "Business contact details in order to provide you our Services at a business level or job title, work history, and professional qualifications if you apply for a job with us",
            "Yes",
          ],
          [
            "J. Inferences drawn from collected personal information",
            "Inferences drawn from any of the collected personal information listed above to create a profile or summary about, for example, an individual's preferences and characteristics",
            "No",
          ],
          ["K. Sensitive personal Information", "Not specified", "No"],
        ],
      },
      {
        type: "p",
        text: "We will use and retain the collected personal information as needed to provide the Services or for:",
      },
      {
        type: "ul",
        items: [
          "As long as the user has an account with us or longer, subject to our data retention policy.",
        ],
      },
      {
        type: "p",
        text: "We may also collect other personal information outside of these categories through instances where you interact with us in person, online, or by phone or mail in the context of:",
      },
      {
        type: "ul",
        items: [
          "Receiving help through our customer support channels;",
          "Participation in customer surveys or contests; and",
          "Facilitation in the delivery of our Services and to respond to your inquiries.",
        ],
      },
      { type: "h3", text: "How do we use and share your personal information?" },
      {
        type: "p",
        text: 'Learn about how we use your personal information in the section "HOW DO WE PROCESS YOUR INFORMATION?"',
      },
      { type: "h3", text: "Will your information be shared with anyone else?" },
      {
        type: "p",
        text: 'We may disclose your personal information with our service providers pursuant to a written contract between us and each service provider. Learn more about how we disclose personal information in the section "WHEN AND WITH WHOM DO WE SHARE YOUR PERSONAL INFORMATION?"',
      },
      {
        type: "p",
        text: 'We may use your personal information for our own business purposes, such as for undertaking internal research for technological development and demonstration. This is not considered to be "selling" of your personal information.',
      },
      {
        type: "p",
        text: "We have not disclosed, sold, or shared any personal information to third parties for a business or commercial purpose in the preceding twelve (12) months. We will not sell or share personal information in the future belonging to website visitors, users, and other consumers.",
      },
      { type: "h3", text: "California Residents" },
      {
        type: "p",
        text: 'California Civil Code Section 1798.83, also known as the "Shine The Light" law, permits our users who are California residents to request and obtain from us, once a year and free of charge, information about categories of personal information (if any) we disclosed to third parties for direct marketing purposes and the names and addresses of all third parties with which we shared personal information in the immediately preceding calendar year. If you are a California resident and would like to make such a request, please submit your request in writing to us using the contact information provided below.',
      },
      {
        type: "p",
        text: "If you are under 18 years of age, reside in California, and have a registered account with the Services, you have the right to request removal of unwanted data that you publicly post on the Services. To request removal of such data, please contact us using the contact information provided below and include the email address associated with your account and a statement that you reside in California. We will make sure the data is not publicly displayed on the Services, but please be aware that the data may not be completely or comprehensively removed from all our systems (e.g., backups, etc.). PLEASE NOTE THAT NO ONE UNDER 18 YEARS OF AGE MAY ESTABLISH AN ACCOUNT.",
      },
      { type: "h3", text: "CCPA Privacy Notice" },
      {
        type: "p",
        text: "This section applies only to California residents. Under the California Consumer Privacy Act (CCPA), you have the rights listed below.",
      },
      {
        type: "p",
        text: 'The California Code of Regulations defines a "residents" as:',
      },
      {
        type: "ul",
        items: [
          "(1) every individual who is in the State of California for other than a temporary or transitory purpose and",
          "(2) every individual who is domiciled in the State of California who is outside the State of California for a temporary or transitory purpose",
        ],
      },
      {
        type: "p",
        text: 'All other individuals are defined as "non-residents."',
      },
      {
        type: "p",
        text: 'If this definition of "resident" applies to you, we must adhere to certain rights and obligations regarding your personal information.',
      },
      { type: "h4", text: "Your rights with respect to your personal data" },
      { type: "h4", text: "Right to request deletion of the data — Request to delete" },
      {
        type: "p",
        text: "You can ask for the deletion of your personal information. If you ask us to delete your personal information, we will respect your request and delete your personal information, subject to certain exceptions provided by law, such as (but not limited to) the exercise by another consumer of his or her right to free speech, our compliance requirements resulting from a legal obligation, or any processing that may be required to protect against illegal activities.",
      },
      { type: "h4", text: "Right to be informed — Request to know" },
      {
        type: "p",
        text: "Depending on the circumstances, you have a right to know:",
      },
      {
        type: "ul",
        items: [
          "whether we collect and use your personal information.",
          "The categories of personal information that we collect;",
          "The purposes for which the collected personal information is used;",
          "Whether we sell or share personal information to third parties;",
          "The categories of personal information that we sold, shared, or disclosed for a business purpose;",
          "The categories of third parties to whom the personal information was sold, shared, or disclosed for a business purpose;",
          "The business or commercial purpose for collecting, selling, or sharing personal information; and",
          "the specific pieces of personal information we collected about you.",
        ],
      },
      {
        type: "p",
        text: "In accordance with applicable law, we are not obligated to provide or delete consumer information that is de-identified in response to a consumer request or to re-identify individual data to verify a consumer request.",
      },
      {
        type: "h4",
        text: "Right to Non-Discrimination for the Exercise of a Consumer's Privacy Rights",
      },
      {
        type: "p",
        text: "We will not discriminate against you if you exercise your privacy rights.",
      },
      {
        type: "h4",
        text: "Right to Limit Use and Disclosure of Sensitive Personal Information",
      },
      {
        type: "p",
        text: "We do not process consumer's sensitive personal information.",
      },
      { type: "h4", text: "Verification process" },
      {
        type: "p",
        text: "Upon receiving your request, we will need to verify your identity to determine you are the same person about whom we have the information in our system. These verification efforts require us to ask you to provide information so that we can match it with information you have previously provided us. For instance, depending on the type of request you submit, we may ask you to provide certain information so that we can match the information you provide with the information we already have on file, or we may contact you through a communication method (e.g., phone or email) that you have previously provided to us. We may also use other verification methods as the circumstances dictate.",
      },
      {
        type: "p",
        text: "We will only use personal information provided in your request to verify your identity or authority to make the request. To the extent possible, we will avoid requesting additional information from you for the purposes of verification. However, if we cannot verify your identity from the information already maintained by us, we may request that you provide additional information for the purposes of verifying your identity and for security or fraud-prevention purposes. We will delete such additionally provided information as soon as we finish verifying you.",
      },
      { type: "h4", text: "Other privacy rights" },
      {
        type: "ul",
        items: [
          "You may object to the processing of your personal information.",
          "You may request correction of your personal data if it is incorrect or no longer relevant, or ask to restrict the processing of the information.",
          "You can designate an authorized agent to make a request under the CCPA on your behalf. We may deny a request from an authorized agent that does not submit proof that they have been validly authorized to act on your behalf in accordance with the CCPA.",
          "You may request to opt out from future selling or sharing of your personal information to third parties. Upon receiving an opt-out request, we will act upon the request as soon as feasibly possible, but no later than fifteen (15) days from the date of the request submission.",
        ],
      },
      {
        type: "p",
        text: "To exercise these rights you can contact us by submitting a data subject access request, by email at support@dataeel.com, by visiting https://www.dataeel.com/contact-us, or by referring to the contact details at the bottom of this document. If you have a complaint about how we handle your data, we would like to hear from you.",
      },
      { type: "h3", text: "Colorado Residents" },
      {
        type: "p",
        text: "This section applies only to Colorado residents. Under the Colorado Privacy Act (CPA), you have the rights listed below. However, these rights are not absolute, and in certain cases we may decline your request as permitted by law.",
      },
      {
        type: "ul",
        items: [
          "Right to be informed whether or not we are processing your personal data",
          "Right to access your personal data",
          "Right to correct inaccuracies in your personal data",
          "Right to request deletion of your personal data",
          "Right to obtain a copy of the personal data you previously shared with us",
          'Right to opt out of the processing of your personal data if it is used for targeted advertising, the sale of personal data, or profiling in furtherance of decisions that produce legal or similarly significant effects ("profiling").',
        ],
      },
      {
        type: "p",
        text: "To submit a request to exercise these rights described above, please email support@dataeel.com or submit a data subject access request.",
      },
      {
        type: "p",
        text: "If we decline to take action regarding your request and you wish to appeal our decision, please email us at support@dataeel.com. Within forty-five (45) days of receipt of an appeal, we will inform you in writing of any action taken or not taken in response to the appeal, including a written explanation of the reasons for the decisions.",
      },
      { type: "h3", text: "Connecticut Residents" },
      {
        type: "p",
        text: "This section applies only to Connecticut residents. Under the Connecticut Data Privacy Act (CTDPA), you have the rights listed below. However, these rights are not absolute, and in certain cases we may decline your request as permitted by law.",
      },
      {
        type: "ul",
        items: [
          "Right to be informed whether or not we are processing your personal data",
          "Right to access your personal data",
          "Right to correct inaccuracies in your personal data",
          "Right to request deletion of your personal data",
          "Right to obtain a copy of the personal data you previously shared with us",
          'Right to opt out of the processing of your personal data if it is used for targeted advertising, the sale of personal data, or profiling in furtherance of decisions that produce legal or similarly significant effects ("profiling")',
        ],
      },
      {
        type: "p",
        text: "To submit a request to exercise these rights described above, please email support@dataeel.com or submit a data subject access request.",
      },
      {
        type: "p",
        text: "If we decline to take action regarding your request and you wish to appeal our decision, please email us at support@dataeel.com. Within sixty (60) days of receipt of an appeal, we will inform you in writing of any action taken or not taken in response to the appeal, including a written explanation of the reasons for the decisions.",
      },
      { type: "h3", text: "Utah Residents" },
      {
        type: "p",
        text: "This section applies only to Utah residents. Under the Utah Consumer Privacy Act (UCPA), you have the rights listed below. However, these rights are not absolute, and in certain cases we may decline your request as permitted by law.",
      },
      {
        type: "ul",
        items: [
          "Right to be informed whether or not we are processing your personal data",
          "Right to access your personal data",
          "Right to request deletion of your personal data",
          "Right to obtain a copy of the personal data you previously shared with us",
          "Right to opt out of the processing of your personal data if it is used for targeted advertising or the sale of personal data",
        ],
      },
      {
        type: "p",
        text: "To submit a request to exercise these rights described above, please email support@dataeel.com or submit a data subject access request.",
      },
      { type: "h3", text: "Virginia Residents" },
      {
        type: "p",
        text: "Under the Virginia Consumer Data Protection Act (VCDPA):",
      },
      {
        type: "ul",
        items: [
          '"Consumer" means a natural person who is a resident of the Commonwealth acting only in an individual or household context. It does not include a natural person acting in a commercial or employment context.',
          '"Personal data" means any information that is linked or reasonably linkable to an identified or identifiable natural person. "Personal data" does not include de-identified data or publicly available information.',
          '"Sale of personal data" means the exchange of personal data for monetary consideration.',
        ],
      },
      {
        type: "p",
        text: 'If this definition of "consumer" applies to you, we must adhere to certain rights and obligations regarding your personal data.',
      },
      { type: "h4", text: "Your rights with respect to your personal data" },
      {
        type: "ul",
        items: [
          "Right to be informed whether or not we are processing your personal data",
          "Right to access your personal data",
          "Right to correct inaccuracies in your personal data",
          "Right to request deletion of your personal data",
          "Right to obtain a copy of the personal data you previously shared with us",
          'Right to opt out of the processing of your personal data if it is used for targeted advertising, the sale of personal data, or profiling in furtherance of decisions that produce legal or similarly significant effects ("profiling")',
        ],
      },
      { type: "h4", text: "Exercise your rights provided under the Virginia VCDPA" },
      {
        type: "p",
        text: "You may contact us by email at support@dataeel.com or submit a data subject access request.",
      },
      {
        type: "p",
        text: "If you are using an authorized agent to exercise your rights, we may deny a request if the authorized agent does not submit proof that they have been validly authorized to act on your behalf.",
      },
      { type: "h4", text: "Verification process" },
      {
        type: "p",
        text: "We may request that you provide additional information reasonably necessary to verify you and your consumer's request. If you submit the request through an authorized agent, we may need to collect additional information to verify your identity before processing your request.",
      },
      {
        type: "p",
        text: "Upon receiving your request, we will respond without undue delay, but in all cases within forty-five (45) days of receipt. The response period may be extended once by forty-five (45) additional days when reasonably necessary. We will inform you of any such extension within the initial 45-day response period, together with the reason for the extension.",
      },
      { type: "h4", text: "Right to appeal" },
      {
        type: "p",
        text: "If we decline to take action regarding your request, we will inform you of our decision and reasoning behind it. If you wish to appeal our decision, please email us at support@dataeel.com. Within sixty (60) days of receipt of an appeal, we will inform you in writing of any action taken or not taken in response to the appeal, including a written explanation of the reasons for the decisions. If your appeal is denied, you may contact the Attorney General to submit a complaint.",
      },
    ],
  },
];
