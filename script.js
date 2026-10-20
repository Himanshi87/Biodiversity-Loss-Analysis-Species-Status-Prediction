const DATA = (typeof BIO !== "undefined") ? BIO : require("./data.js");
const ORDER = ["LC", "NT", "VU", "EN", "CR", "EX"];
const LABEL = {LC: "Least Concern", NT: "Near Threatened", VU: "Vulnerable", EN: "Endangered", CR: "Critically Endangered", EX: "Extinct"};
const COLOR = {LC: "#4c9f50", NT: "#a6c34a", VU: "#f2c230", EN: "#f28c28", CR: "#d64545", EX: "#4a4a4a"};
const TIER = {LC: "Low", NT: "Low", VU: "Medium", EN: "High", CR: "High", EX: "High"};

function predict(group, status) {
  const known = Object.prototype.hasOwnProperty.call(DATA.model, group);
  const table = (known ? DATA.model[group] : DATA.model.__unseen__)[status];
  if (!table) throw new Error("Invalid status: " + status);
  const rows = Object.entries(table).sort((a, b) => b[1] - a[1]);
  const r0 = ORDER.indexOf(status);
  const sum = f => rows.filter(([c]) => f(ORDER.indexOf(c))).reduce((a, [, v]) => a + v, 0);
  return {top: rows[0][0], conf: rows[0][1], rows, known,
          worse: sum(i => i > r0), better: sum(i => i < r0), same: sum(i => i === r0)};
}

if (typeof document !== "undefined") {
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
  const pc = x => (x * 100).toFixed(1) + "%";
  const badge = s => `<span class="badge" style="background:${COLOR[s]}">${s}</span> ${LABEL[s]}`;

  if (DATA.demo) $("demo").innerHTML = "⚠️ <b>Demo model:</b> trained on synthetic data, so predictions are NOT real findings. Run <code>export_model.py</code> with your real dataset (see README).";
  $("names").innerHTML = DATA.species.map(s => `<option value="${esc(s[1] || s[0])}">${esc(s[0])}</option>`).join("");
  $("status").innerHTML = ORDER.map(s => `<option value="${s}">${s} – ${LABEL[s]}</option>`).join("");
  $("group").innerHTML = DATA.groups.map(g => `<option>${esc(g)}</option>`).join("") + '<option value="__unseen__">Other / not in training data</option>';

  $("form").addEventListener("submit", e => {
    e.preventDefault();
    const q = $("name").value.trim().toLowerCase();
    const sp = DATA.species.find(s => s[0].toLowerCase() === q || (s[1] || "").toLowerCase() === q);
    let status, group, title, extra = "";
    if (sp) {
      [title, status, group] = [sp[1] ? `${sp[1]} (<i>${esc(sp[0])}</i>)` : `<i>${esc(sp[0])}</i>`, sp[3], sp[2]];
      extra = `<p class="meta">Current status: ${badge(status)} · Group: ${esc(group)}${sp[4] ? ` · Recorded next status: <b>${sp[4]}</b>` : ""}</p>`;
    } else {
      if (!$("manual").open) {
        $("manual").open = true;
        $("result").innerHTML = `<p class="err">“${esc($("name").value)}” is not in the species list. Choose its current status and taxonomic group above, then press Predict again.</p>`;
        return;
      }
      [status, group, title] = [$("status").value, $("group").value, esc($("name").value.trim())];
      extra = `<p class="meta">Using your inputs: ${badge(status)} · Group: ${esc(group === "__unseen__" ? "Other" : group)}</p>`;
    }
    if (status === "EX") {
      $("result").innerHTML = `<h2>${title}</h2>${extra}<p>This species is already <b>Extinct</b>; no further prediction applies.</p>`;
      return;
    }
    const r = predict(group, status);
    const bars = r.rows.map(([c, v]) => `<div class="bar"><span>${c}</span><div class="track"><div class="fill" style="width:${v * 100}%;background:${COLOR[c]}"></div></div><span>${pc(v)}</span></div>`).join("");
    $("result").innerHTML = `<h2>${title}</h2>${extra}
      <p>Predicted next IUCN status:</p><p>${badge(r.top)}</p>
      <p>Confidence ${pc(r.conf)} · Risk tier: <b>${TIER[r.top]}</b> · Worsen ${pc(r.worse)} / Improve ${pc(r.better)} / Same ${pc(r.same)}</p>
      ${bars}${r.known ? "" : '<p class="note">⚠️ Group not in training data; prediction relies mainly on current status.</p>'}
      <p class="note">Probabilities are conditional on the status changing, as the training data only contains changed species.</p>`;
  });
}
if (typeof module !== "undefined") module.exports = {predict};
