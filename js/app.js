/* global HelpdeskTriage, HelpdeskSamples */
(function () {
  const $ = (id) => document.getElementById(id);
  const ticket = $("ticket");
  const results = $("results");
  const empty = $("empty-state");
  const samplesEl = $("samples");
  const statusEl = $("status");

  function setStatus(msg, kind) {
    statusEl.textContent = msg || "";
    statusEl.dataset.kind = kind || "";
  }

  function renderSamples() {
    samplesEl.innerHTML = "";
    HelpdeskSamples.forEach((s) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "sample";
      btn.innerHTML =
        "<span class='sample-id'>" +
        s.id +
        "</span><span class='sample-title'>" +
        s.title +
        "</span>";
      btn.addEventListener("click", () => {
        ticket.value = s.text;
        run(s.id);
      });
      samplesEl.appendChild(btn);
    });
  }

  function matrixTable(impact, urgency) {
    const levels = ["High", "Medium", "Low"];
    const map = HelpdeskTriage.PRIORITY_MATRIX;
    let html =
      "<table class='matrix' aria-label='ITIL impact times urgency matrix'><thead><tr><th>Impact \\ Urgency</th>";
    levels.forEach((u) => {
      html += "<th>" + u + "</th>";
    });
    html += "</tr></thead><tbody>";
    levels.forEach((imp) => {
      html += "<tr><th>" + imp + "</th>";
      levels.forEach((urg) => {
        const cell = map[imp + "|" + urg];
        const on = imp === impact && urg === urgency;
        html +=
          "<td class='" +
          (on ? "is-on " : "") +
          cell.id.toLowerCase() +
          "'>" +
          cell.id +
          " " +
          cell.label +
          "</td>";
      });
      html += "</tr>";
    });
    html += "</tbody></table>";
    return html;
  }

  function render(result, sourceId) {
    empty.hidden = true;
    results.hidden = false;
    $("out-category").textContent = result.category;
    $("out-priority").textContent = result.priority.id + " · " + result.priority.label;
    $("out-priority").className = "pill " + result.priority.id.toLowerCase();
    $("out-impact").textContent = result.impact;
    $("out-urgency").textContent = result.urgency;
    $("out-confidence").textContent = result.confidence + "%";
    $("out-sla").textContent = result.priority.sla;
    $("matrix-wrap").innerHTML = matrixTable(result.impact, result.urgency);
    $("out-response").value = result.firstResponse;
    $("out-steps").innerHTML = result.nextSteps.map((s) => "<li>" + s + "</li>").join("");
    const signals = result.signals
      .map(
        (s) =>
          "<li><strong>" +
          s.type +
          " → " +
          s.target +
          "</strong> “" +
          s.match +
          "” — " +
          s.detail +
          " (+" +
          s.points +
          ")</li>"
      )
      .join("");
    $("out-signals").innerHTML =
      signals || "<li>No keyword rule fired. Defaults were used: low impact, medium urgency, best-effort category.</li>";
    const scores = Object.entries(result.categoryScores || {})
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => k + " " + v)
      .join(" · ");
    $("out-scores").textContent = scores || "No category score";
    $("out-source").textContent = sourceId ? "Sample " + sourceId : "Pasted ticket";
    $("ai-output").hidden = true;
    $("ai-output").textContent = "";
  }

  function run(sourceId) {
    const result = HelpdeskTriage.analyze(ticket.value, {
      user: $("meta-user").value,
      system: $("meta-system").value,
      location: $("meta-location").value,
    });
    if (!result.ok) {
      setStatus(result.error, "err");
      return;
    }
    render(result, sourceId);
    setStatus("Triaged with the visible rule set. Nothing was sent to an API.", "ok");
    results.scrollIntoView({ behavior: "smooth", block: "start" });
    return result;
  }

  $("btn-analyze").addEventListener("click", () => run());
  $("btn-clear").addEventListener("click", () => {
    ticket.value = "";
    $("meta-user").value = "";
    $("meta-system").value = "";
    $("meta-location").value = "";
    results.hidden = true;
    empty.hidden = false;
    setStatus("");
  });
  $("btn-copy").addEventListener("click", async () => {
    const text = $("out-response").value;
    try {
      await navigator.clipboard.writeText(text);
      setStatus("First-response template copied.", "ok");
    } catch (err) {
      $("out-response").select();
      setStatus("Select the template and copy it manually.", "err");
    }
  });

  $("toggle-ai").addEventListener("click", () => {
    const panel = $("ai-panel");
    const open = panel.hidden;
    panel.hidden = !open;
    $("toggle-ai").setAttribute("aria-expanded", String(open));
  });

  $("btn-ai").addEventListener("click", async () => {
    const key = $("ai-key").value.trim();
    const base = ($("ai-base").value.trim() || "https://api.openai.com/v1").replace(/\/+$/, "");
    const model = $("ai-model").value.trim() || "gpt-4.1-mini";
    if (!key) {
      setStatus("Add your own API key first. The key stays in this browser and is never stored on a server.", "err");
      return;
    }
    const ruleResult = HelpdeskTriage.analyze(ticket.value, {
      user: $("meta-user").value,
      system: $("meta-system").value,
      location: $("meta-location").value,
    });
    if (!ruleResult.ok) {
      setStatus(ruleResult.error, "err");
      return;
    }
    $("btn-ai").disabled = true;
    setStatus("Asking the optional model for a second opinion…", "ok");
    const payload = {
      model,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You are a cautious IT service-desk coach. Compare the ticket with the rule-based triage. If you disagree, explain why. Do not invent tools, access, or facts that are not in the ticket. Return short markdown with: Agreement (yes/no), Suggested category, Suggested priority (P1–P4), and two sentences of advice for a first-line analyst.",
        },
        {
          role: "user",
          content:
            "Ticket:\n" +
            ticket.value +
            "\n\nRule-based result:\n" +
            JSON.stringify(
              {
                category: ruleResult.category,
                impact: ruleResult.impact,
                urgency: ruleResult.urgency,
                priority: ruleResult.priority.id,
                signals: ruleResult.signals,
              },
              null,
              2
            ),
        },
      ],
    };
    try {
      const res = await fetch(base + "/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + key,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data && data.error && data.error.message) || "HTTP " + res.status);
      }
      const text = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
      $("ai-output").hidden = false;
      $("ai-output").textContent = text || "The model returned an empty response.";
      setStatus("Second opinion received. The rule-based result above is unchanged.", "ok");
    } catch (err) {
      setStatus("Optional AI call failed: " + err.message, "err");
    } finally {
      $("btn-ai").disabled = false;
    }
  });

  ticket.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") run();
  });

  renderSamples();
})();
