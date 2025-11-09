async function postJSON(path, data) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

const titleEl = document.getElementById("title");
const leadEl = document.getElementById("lead");
const urlsEl = document.getElementById("urls");
const slugEl = document.getElementById("slug");
const resultEl = document.getElementById("result");
const submitBtn = document.getElementById("submit");

// ✅ LocalStorage 保存
function saveToLocalStorage() {
  localStorage.setItem("blog_title", titleEl.value);
  localStorage.setItem("blog_lead", leadEl.value);
  localStorage.setItem("blog_urls", urlsEl.value);
  localStorage.setItem("blog_slug", slugEl.value);
}

// ✅ 起動時に復元
function restoreFromLocalStorage() {
  titleEl.value = localStorage.getItem("blog_title") || "";
  leadEl.value = localStorage.getItem("blog_lead") || "";
  urlsEl.value = localStorage.getItem("blog_urls") || "";
  slugEl.value = localStorage.getItem("blog_slug") || "";
}

// 入力毎に保存
[titleEl, leadEl, urlsEl, slugEl].forEach((el) =>
  el.addEventListener("input", saveToLocalStorage)
);

// 初期読み込み
restoreFromLocalStorage();

submitBtn.addEventListener("click", async () => {
  resultEl.textContent = "作成中…";

  const title = titleEl.value.trim();
  const lead = leadEl.value.trim();
  const urls = urlsEl.value.split("\n").map((x) => x.trim()).filter(Boolean);
  const slug = slugEl.value.trim() || undefined;

  try {
    const apiBase = "http://localhost:3000";

    const json = await postJSON(`${apiBase}/api/generate`, {
      title,
      lead,
      urls,
      slug,
    });

    if (json.error) {
      resultEl.textContent = `エラー: ${json.error}`;
      return;
    }

    resultEl.innerHTML = `✅ 下書きを作成しました<br>
      <small><a href="${json.preview_url}" target="_blank">${json.preview_url}</a></small>`;
  } catch (e) {
    resultEl.textContent = `エラー: ${e.message || e}`;
  }
});
