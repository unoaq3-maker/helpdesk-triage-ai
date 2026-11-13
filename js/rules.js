/* HelpDesk Triage AI — transparent rule engine.
 * Works in the browser and in Node (no DOM).
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.HelpdeskTriage = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const CATEGORIES = [
    "Access & Identity",
    "Email & Microsoft 365",
    "Network & Connectivity",
    "Hardware",
    "Printing",
    "Software & Applications",
    "Security",
    "Service Request",
  ];

  const PRIORITY_MATRIX = {
    "High|High": { id: "P1", label: "Critical", sla: "Respond immediately; major-incident path if many users are blocked." },
    "High|Medium": { id: "P2", label: "High", sla: "Respond within the short high-priority window; keep the requester updated." },
    "Medium|High": { id: "P2", label: "High", sla: "Respond within the short high-priority window; keep the requester updated." },
    "High|Low": { id: "P3", label: "Medium", sla: "Respond in the standard queue; agree a fix or workaround window." },
    "Medium|Medium": { id: "P3", label: "Medium", sla: "Respond in the standard queue; agree a fix or workaround window." },
    "Low|High": { id: "P3", label: "Medium", sla: "One user, but work is stopped now — treat promptly and offer a workaround." },
    "Medium|Low": { id: "P4", label: "Low", sla: "Schedule in the normal queue; confirm expectations." },
    "Low|Medium": { id: "P4", label: "Low", sla: "Schedule in the normal queue; confirm expectations." },
    "Low|Low": { id: "P4", label: "Low", sla: "Schedule in the normal queue; confirm expectations." },
  };

  const CATEGORY_RULES = [
    { category: "Security", weight: 5, pattern: /\b(phish|spearphish|malware|ransomware|suspicious link|clicked the link|clicked a link|credential theft|data leak|compromised|unauthorized access|virus|trojan|stole my password|token theft)\b/i, why: "Security-incident language (phishing, malware, compromise)." },
    { category: "Security", weight: 4, pattern: /\b(have i been pwned|hibp|stolen cookie|session hijack|ioc|indicator of compromise)\b/i, why: "Mentions of stolen sessions, IoCs or breach-checking." },
    { category: "Access & Identity", weight: 4, pattern: /\b(locked out|account is locked|account locked|password (reset|expired|forgotten)|can't log ?in|cannot log ?in|unable to (log|sign) ?in|mfa|multi-factor|authenticator|otp|one-time (code|password)|conditional access|entra|azure ad|active directory|disabled account|expired password)\b/i, why: "Login, password, MFA or directory-account symptoms." },
    { category: "Printing", weight: 4, pattern: /\b(printer|printing|print queue|spooler|toner|paper jam|can't print|cannot print|won't print|label printer)\b/i, why: "Printer or print-queue language." },
    { category: "Email & Microsoft 365", weight: 4, pattern: /\b(outlook|o365|microsoft 365|m365|exchange online|mailbox|can't send (email|mail)|cannot send (email|mail)|email (bounce|bouncing)|ndr|teams (meeting|audio|mic|camera)|sharepoint|onedrive|calendar invite)\b/i, why: "Outlook, Exchange, Teams, SharePoint or other M365 symptoms." },
    { category: "Network & Connectivity", weight: 4, pattern: /\b(vpn|wifi|wi-fi|wireless|no (internet|network|connectivity)|can't connect|cannot connect|ip address|dns|dhcp|ethernet|cable unplugged|offline|packet loss|high latency|switch port)\b/i, why: "Network, VPN, Wi-Fi or IP/DNS/DHCP language." },
    { category: "Hardware", weight: 4, pattern: /\b(laptop|notebook|won't boot|will not boot|blue screen|bsod|no power|battery swollen|cracked screen|docking station|keyboard not working|overheat|hardware failure|hard drive|ssd|desktop (pc|computer)|my desktop|the desktop)\b/i, why: "Device or hardware-failure language." },
    { category: "Software & Applications", weight: 3, pattern: /\b(application crash|app crash|software (crash|error|update)|install(ation)? failed|licence|license key|line-of-business|erp|core banking|crm|sap|won't open|cannot open the app)\b/i, why: "Business-application or software-install language." },
    { category: "Service Request", weight: 6, pattern: /\b(please (create|provide|grant|raise)|new starter|new joiner|onboarding|request (for )?access|need access to|need permission|can I have|please add me|standard laptop|order a|service request)\b/i, why: "Fulfilment / request wording rather than a break-fix." },
  ];

  const IMPACT_RULES = [
    { level: "High", weight: 5, pattern: /\b(all users|entire (floor|branch|department|dept|building|site|office)|whole (floor|branch|department|team|office)|everyone (is |in )?(down|affected|unable)|multiple departments|customer-facing (channel|service) down|core (banking|system) down|payment(s)? (are )?down)\b/i, why: "Many users, a whole area, or a business-critical service is affected." },
    { level: "High", weight: 4, pattern: /\b(dozens of users|20\+ users|more than \d{2} users|the whole team cannot)\b/i, why: "A large group of users is named." },
    { level: "Medium", weight: 3, pattern: /\b(several users|a few users|our team of \d+|small team|three of us|my team can't|shared (desk|area)|meeting room)\b/i, why: "A small group or shared space is affected." },
    { level: "Low", weight: 2, pattern: /\b(only (me|myself|my account|one user)|just me|single user|I am the only)\b/i, why: "Clearly limited to one person." },
  ];

  const URGENCY_RULES = [
    { level: "High", weight: 5, pattern: /\b(right now|immediately|(?<!not )urgent|can't (do any )?work|cannot (do any )?work|can't log ?in|cannot log ?in|cannot complete sign-in|cannot send|can't send|cannot connect|can't connect|nobody can hear|cannot hear|work is stopped|business halted|customers waiting|meeting (starts|in) \d+|board meeting|payroll today|clicked the link|clicked a link|typed my password|entered (my )?credentials|possible (breach|compromise)|ransomware|no workaround)\b/i, why: "Work is stopped now, a hard deadline is close, or this may be a security incident." },
    { level: "Medium", weight: 3, pattern: /\b(this afternoon|today|degraded|intermittent|slow(ing)?|soon|before end of day|eod|workaround is painful)\b/i, why: "Needed today, or the service is degraded rather than fully down." },
    { level: "Low", weight: 2, pattern: /\b(when you have time|no rush|sometime this week|nice to have|can wait|not urgent|whenever possible)\b/i, why: "The requester can wait." },
  ];

  function normalize(text) {
    return String(text || "").replace(/\s+/g, " ").trim();
  }

  function applyRules(text, rules) {
    const hits = [];
    for (const rule of rules) {
      const m = text.match(rule.pattern);
      if (m) hits.push({ ...rule, match: m[0] });
    }
    return hits;
  }

  function pickScored(hits, defaultLevel) {
    if (!hits.length) return { level: defaultLevel, score: 0, hits: [] };
    const scores = {};
    for (const h of hits) {
      const key = h.category || h.level;
      scores[key] = (scores[key] || 0) + h.weight;
    }
    const winner = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
    return { level: winner[0], score: winner[1], hits, scores };
  }

  function firstResponse(category, priority, impact, urgency) {
    const open =
      "Hello, thank you for raising this. I have logged your ticket and I am looking at it now.";
    const close =
      "I will update you as soon as I have a next step. If anything changes at your end (error message, screenshot, or a workaround you tried), please reply on this ticket.";
    const byCat = {
      "Access & Identity":
        "To reset or unlock the account safely I will confirm your identity first, then check whether this is a locked account, an expired password, an MFA registration issue, or a Conditional Access block. Please tell me the exact error message, the device and browser you are using, and whether MFA prompts appear at all.",
      "Email & Microsoft 365":
        "I will check whether this is limited to your mailbox or a wider Microsoft 365 issue. Please send a screenshot of the error, the time it started, whether web Outlook (outlook.office.com) works, and whether you are on VPN or office Wi-Fi.",
      "Network & Connectivity":
        "I will isolate this as device, local network, or upstream. Please note whether the issue is wired, Wi-Fi or VPN, whether colleagues nearby are affected, and the result of a quick check: Wi-Fi/VPN icon, any IP address on the adapter, and whether you can open an internal site versus an external one.",
      Hardware:
        "I will start with the obvious physical checks (power, cables, dock, external display) and then look at boot errors or recent changes. Please tell me what you see on the screen (or if it stays dark), any lights or beeps, and when it last worked.",
      Printing:
        "I will check whether this is the device, the queue, the driver or network reachability. Please note the printer name, whether other people can print, any error on the panel, and whether you can see the printer on the network.",
      "Software & Applications":
        "I will check recent changes (updates, new plugins, licence, permissions) before escalating to the app owner. Please include the application name and version, the exact error, when it started, and whether a colleague on the same app is affected.",
      Security:
        "I am treating this as a security incident until we prove otherwise. Please stop interacting with the message or file, do not enter any more passwords, and tell me the time of the click, the sender, and whether you entered credentials or opened an attachment. I will raise this to the security path and help revoke sessions if needed.",
      "Service Request":
        "This looks like a service request rather than a break-fix, so I will log it for fulfilment and check the approval path. Please confirm the system you need, the access level, the manager who can approve it, and the date you need it by.",
    };
    const pNote =
      priority.id === "P1"
        ? "Because this may affect many users or a critical service, I am prioritising it as P1 and will stay with you until we have a workaround or a major-incident update."
        : priority.id === "P2"
        ? "I have set this as P2 (high) based on impact and urgency, and I will aim to come back quickly with either a fix or a clear next step."
        : "I have set an initial priority of " +
          priority.id +
          " (" +
          priority.label +
          ") from impact " +
          impact +
          " × urgency " +
          urgency +
          ". If the impact is wider than it appears, tell me and I will re-score it.";
    return [open, pNote, byCat[category] || "", close].filter(Boolean).join("\n\n");
  }

  function nextSteps(category, priority) {
    const common = [
      "Confirm the requester, contact number, location, and a callback window.",
      "Record the exact error text, start time, and recent changes (updates, new hardware, new access).",
      "Ask whether anyone else is affected — that can change impact and priority.",
    ];
    const byCat = {
      "Access & Identity": [
        "Identify the user in the directory (on-prem AD or Entra ID) and check enabled/locked/expired/password age.",
        "Check MFA registration and any Conditional Access failure in the sign-in log.",
        "If a password is reset, also consider signing the user out of other sessions when compromise is possible.",
        "Escalate to identity/security if the account looks disabled by policy or shows suspicious sign-ins.",
      ],
      "Email & Microsoft 365": [
        "Test Outlook desktop vs Outlook on the web to split client issues from service issues.",
        "Check licence, mailbox size, and any transport/NDR message.",
        "For Teams, test audio devices, client cache, and whether the meeting opens in the browser.",
        "Escalate to the M365 / messaging owner if the issue is tenant-wide.",
      ],
      "Network & Connectivity": [
        "Confirm physical layer (link lights, cabling, Wi-Fi SSID, airplane mode) then IP/DHCP then DNS.",
        "Compare with a nearby working machine on the same switch or SSID.",
        "For VPN, check client version, certificate/MFA, and whether the failure is before or after the tunnel comes up.",
        "Escalate to network operations if a floor, branch or gateway is down.",
      ],
      Hardware: [
        "Work through power, peripherals, dock and external display before opening a break-fix.",
        "Capture the exact boot error or BSOD code.",
        "Offer a loaner device if the user cannot work and repair will take time.",
        "Raise a hardware ticket with the vendor or desktop engineering if it is a device fault.",
      ],
      Printing: [
        "Confirm the printer is powered, online, and free of jams or toner faults.",
        "Test a print from another user and from a web/admin page to split workstation vs device.",
        "Restart the print spooler and clear a stuck queue if it is safe to do so.",
        "Escalate to the print-server or facilities owner if the device is dead or offline on the network.",
      ],
      "Software & Applications": [
        "Reproduce the error and collect logs or a screenshot.",
        "Check recent patches, plugin changes and licence status.",
        "Try a known-good profile or another PC if available.",
        "Escalate to the application owner with the evidence pack.",
      ],
      Security: [
        "Do not wait for a perfect write-up — contain first: isolate the device if malware is suspected, and revoke sessions/passwords if credentials may have been entered.",
        "Preserve evidence (email headers, file, timestamp, URL) and log a security incident.",
        "Hand over to the security team / SOC with what is already known.",
        "Only then complete the user-facing write-up and any required notifications.",
      ],
      "Service Request": [
        "Confirm the request type, the system, and the approval rule (manager, data owner, licence).",
        "Check whether a standard catalogue item already exists.",
        "Set a realistic fulfilment date and keep the requester informed.",
        "Do not treat this as an incident unless something is actually broken.",
      ],
    };
    const pSteps =
      priority.id === "P1"
        ? ["Notify the service-desk lead and start a major-incident bridge if many users or a critical service are down."]
        : [];
    return common.concat(pSteps, byCat[category] || []);
  }

  function analyze(ticketText, meta) {
    const text = normalize(ticketText);
    if (!text) {
      return { ok: false, error: "Paste a ticket first." };
    }
    const combined = normalize(
      [text, meta && meta.user, meta && meta.system, meta && meta.location].filter(Boolean).join("\n")
    );

    const catHits = applyRules(combined, CATEGORY_RULES);
    const catPick = pickScored(catHits, "Software & Applications");
    // Service requests should not win over a clear security or outage signal
    let category = catPick.level;
    const scores = catPick.scores || {};
    if ((scores.Security || 0) >= 5 && category === "Service Request") category = "Security";

    const impactHits = applyRules(combined, IMPACT_RULES);
    const urgencyHits = applyRules(combined, URGENCY_RULES);
    let impact = pickScored(impactHits, "Low").level;
    let urgency = pickScored(urgencyHits, "Medium").level;

    // Security incidents: urgency at least High. Credential theft is at least Medium impact.
    if (category === "Security" && urgency === "Low") urgency = "High";
    if (category === "Security" && /\b(typed my password|entered (my )?credentials|compromised|stole my password)\b/i.test(combined) && impact === "Low") {
      impact = "Medium";
    }
    // Service requests default to Low urgency unless the text says otherwise
    if (category === "Service Request" && !urgencyHits.length) urgency = "Low";
    if (!impactHits.length && category !== "Security") {
      // default: one-person break-fix is Low impact
      impact = "Low";
    }
    if (!impactHits.length && /\b(all|everyone|entire|whole floor|branch)\b/i.test(combined)) {
      impact = "High";
    }

    const priority = PRIORITY_MATRIX[impact + "|" + urgency] || PRIORITY_MATRIX["Low|Medium"];
    const signals = []
      .concat(catHits.map((h) => ({ type: "Category", detail: h.why, match: h.match, points: h.weight, target: h.category })))
      .concat(impactHits.map((h) => ({ type: "Impact", detail: h.why, match: h.match, points: h.weight, target: h.level })))
      .concat(urgencyHits.map((h) => ({ type: "Urgency", detail: h.why, match: h.match, points: h.weight, target: h.level })));

    const maxScore = Math.max(catPick.score, 1);
    const confidence = Math.max(35, Math.min(95, 40 + maxScore * 8 + Math.min(signals.length, 6) * 3));

    return {
      ok: true,
      text,
      category,
      categoryScores: scores,
      impact,
      urgency,
      priority,
      confidence,
      signals,
      firstResponse: firstResponse(category, priority, impact, urgency),
      nextSteps: nextSteps(category, priority),
      matrix: PRIORITY_MATRIX,
      categories: CATEGORIES,
    };
  }

  return { analyze, CATEGORIES, PRIORITY_MATRIX, CATEGORY_RULES, IMPACT_RULES, URGENCY_RULES };
});
