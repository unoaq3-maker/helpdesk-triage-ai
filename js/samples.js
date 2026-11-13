(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.HelpdeskSamples = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  return [
    {
      id: "T01",
      title: "Account locked after failed logins",
      expectedCategory: "Access & Identity",
      expectedPriority: "P3",
      text:
        "Hi helpdesk, I am the only one affected. My Windows account is locked after I typed the wrong password a few times. I cannot log in to my laptop and I have a client call this afternoon. Please unlock my account or reset the password. Error: “Your account is locked. Contact your administrator.”",
    },
    {
      id: "T02",
      title: "Whole floor cannot print",
      expectedCategory: "Printing",
      expectedPriority: "P1",
      text:
        "The entire 3rd floor cannot print. The shared Finance printer FIN-3F-01 is offline, the print queue is stuck, and invoices cannot go out. All users on this floor are affected and there is no workaround. Customers are waiting. Please treat this as urgent.",
    },
    {
      id: "T03",
      title: "VPN will not connect",
      expectedCategory: "Network & Connectivity",
      expectedPriority: "P3",
      text:
        "I am working from home and the VPN client cannot connect. It sits on “authenticating” and then fails. Just me, my colleagues are fine. I need files from the shared drive today. I am on home Wi-Fi, not ethernet. Any IP address on the VPN adapter disappears when it fails.",
    },
    {
      id: "T04",
      title: "Outlook cannot send email",
      expectedCategory: "Email & Microsoft 365",
      expectedPriority: "P3",
      text:
        "Outlook desktop cannot send email. I can receive new mail, but every outgoing message stays in the Outbox and then I get an NDR. Web Outlook in the browser also struggles to send. Only my mailbox as far as I know. Started this morning after a Microsoft 365 update.",
    },
    {
      id: "T05",
      title: "MFA prompts not arriving",
      expectedCategory: "Access & Identity",
      expectedPriority: "P3",
      text:
        "I cannot complete sign-in because MFA prompts are not arriving on my authenticator app. I never get the OTP or the approve button. I am not locked out of Windows itself, but I cannot log in to Outlook or the VPN. Only my account. I have a meeting later today.",
    },
    {
      id: "T06",
      title: "New starter needs SharePoint access",
      expectedCategory: "Service Request",
      expectedPriority: "P4",
      text:
        "Please grant access to the Marketing SharePoint library for a new starter, Sara Ahmed, starting next week. Her manager can approve it. This is not urgent — sometime this week is fine. She also needs to be added to the Marketing mailing group. Service request for onboarding access only; nothing is broken.",
    },
    {
      id: "T07",
      title: "User clicked a phishing link",
      expectedCategory: "Security",
      expectedPriority: "P2",
      text:
        "I think I clicked a link in a suspicious email that looked like a password reset. The page asked me to enter my credentials and I typed my password before I realised it was probably phishing. This happened about 20 minutes ago. I have not run any attachment. Please help — I am worried the account is compromised.",
    },
    {
      id: "T08",
      title: "Laptop will not boot",
      expectedCategory: "Hardware",
      expectedPriority: "P3",
      text:
        "My laptop will not boot. It was working yesterday. Now the screen stays dark, no Windows logo, and I only get a brief light on the power button. I tried the docking station and a spare charger. I am the only one affected but I cannot do any work on this device until it is fixed or I get a loaner.",
    },
    {
      id: "T09",
      title: "Teams meeting has no audio",
      expectedCategory: "Email & Microsoft 365",
      expectedPriority: "P3",
      text:
        "Microsoft Teams: nobody can hear me in a Teams meeting and I cannot hear them either. The mic and camera permissions look allowed. Headset works in other apps. Started today. Just my PC, colleagues in the same meeting are fine. I have another Teams meeting this afternoon.",
    },
    {
      id: "T10",
      title: "Wi-Fi down on the whole 2nd floor",
      expectedCategory: "Network & Connectivity",
      expectedPriority: "P1",
      text:
        "Wi-Fi is down for the entire 2nd floor. All users in this area have no internet and cannot reach internal systems. Wired ethernet at two desks also has no connectivity. This started 15 minutes ago, right now nobody on the floor can work, and there is no workaround. Please escalate if the switch or access points are down.",
    },
  ];
});
