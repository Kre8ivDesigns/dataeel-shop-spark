export const DISCLAIMER_INTRO =
  'The information provided on this website, including but not limited to race predictions, calculated outcomes, and other analytical data (collectively, "the Content"), is for informational and entertainment purposes only. While we strive to provide accurate and up-to-date information, we make no warranties or representations of any kind, express or implied, about the completeness, accuracy, reliability, suitability, or availability of the Content for any purpose.';

export type DisclaimerSection = {
  id: string;
  title: string;
  paragraphs: string[];
};

export const DISCLAIMER_SECTIONS: DisclaimerSection[] = [
  {
    id: "no-gambling-or-financial-advice",
    title: "No Gambling or Financial Advice",
    paragraphs: [
      "The Content provided on this website does not constitute financial, investment, or gambling advice. We do not endorse or encourage any form of gambling or betting. The information provided is intended solely for entertainment and informational purposes. Any reliance you place on the Content is strictly at your own risk, and you should not use this information as the sole basis for making any financial or gambling decisions.",
    ],
  },
  {
    id: "gambling-risk-warning",
    title: "Gambling Risk Warning",
    paragraphs: [
      "Horse racing and other forms of gambling carry inherent risks. The outcomes of races and the success of any betting strategies are unpredictable and subject to numerous variables, many of which are beyond our control. You acknowledge that gambling can result in financial loss and should only be undertaken if you can afford to lose the money wagered. We strongly advise that you gamble responsibly and seek help from gambling support organizations if needed.",
    ],
  },
  {
    id: "no-guarantee-of-accuracy",
    title: "No Guarantee of Accuracy",
    paragraphs: [
      "The analytics and predictions provided are based on complex algorithms and data analysis, which are subject to change and interpretation. Past performance is not indicative of future results. We do not guarantee the accuracy or completeness of any race outcome predictions. Use them alongside official race information and your own judgment.",
    ],
  },
  {
    id: "no-responsibility-for-third-party-actions",
    title: "No Responsibility for Third-Party Actions",
    paragraphs: [
      "We are not responsible for any third-party actions or decisions, including but not limited to betting decisions made by users based on the Content provided. Any actions taken by you based on the information provided on this website are at your own discretion and risk.",
    ],
  },
  {
    id: "limitation-of-liability",
    title: "Limitation of Liability",
    paragraphs: [
      "To the fullest extent permitted by law, we disclaim all liability for any loss, injury, or damage, including without limitation, direct, indirect, incidental, or consequential damages, resulting from your use of or reliance on the Content, even if we have been advised of the possibility of such damages. This includes, but is not limited to, losses arising from errors, omissions, or inaccuracies in the information provided on this website, or losses incurred as a result of gambling.",
    ],
  },
  {
    id: "user-responsibility",
    title: "User Responsibility",
    paragraphs: [
      "By using this website, you acknowledge and agree that it is your responsibility to independently verify any information before relying on it. You should seek professional advice where necessary. If you choose to engage in gambling activities, you do so at your own risk and are responsible for complying with the laws and regulations applicable in your jurisdiction.",
    ],
  },
  {
    id: "gambling-support",
    title: "Gambling Support",
    paragraphs: [
      "If you feel that you may have a gambling problem or that gambling is negatively affecting your life or the lives of those around you, we encourage you to seek help. Various organizations offer support and resources for individuals dealing with gambling issues.",
    ],
  },
  {
    id: "changes-to-the-disclaimer",
    title: "Changes to the Disclaimer",
    paragraphs: [
      "We reserve the right to modify or update this disclaimer at any time without prior notice. It is your responsibility to review this disclaimer periodically to ensure you are aware of any changes.",
    ],
  },
  {
    id: "governing-law",
    title: "Governing Law",
    paragraphs: [
      "This disclaimer is governed by and construed in accordance with the laws of the jurisdiction in which the company operates, without regard to its conflict of law principles.",
    ],
  },
];
