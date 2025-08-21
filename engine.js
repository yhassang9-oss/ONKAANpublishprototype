const textTool = document.getElementById("textTool");
const selectTool = document.getElementById("selecttool");
const undoBtn = document.getElementById("undo");
const redoBtn = document.getElementById("redo");
const colorTool = document.getElementById("color");
const imageTool = document.getElementById("image");
const buttonTool = document.getElementById("Buttons");

const previewFrame = document.getElementById("previewFrame");

let activeTool = null;
let selectedElement = null;
let historyStack = [];
let historyIndex = -1;
let colorPanel = null;
let buttonPanel = null;

// --- Tool toggle functions ---
function deactivateAllTools() {
  activeTool = null;
  textTool.classList.remove("active-tool");
  selectTool.classList.remove("active-tool");

  if (selectedElement) {
    selectedElement.style.outline = "none";
    removeHandles(previewFrame.contentDocument || previewFrame.contentWindow.document);
    selectedElement = null;
  }

  if (colorPanel) { colorPanel.remove(); colorPanel = null; }
  if (buttonPanel) { buttonPanel.style.display = "none"; }
}

// --- History functions ---
function saveHistory() {
  const iframeDoc = previewFrame.contentDocument || previewFrame.contentWindow.document;
  historyStack = historyStack.slice(0, historyIndex + 1);
  historyStack.push(iframeDoc.body.innerHTML);
  historyIndex++;
}

function undo() {
  if (historyIndex > 0) {
    historyIndex--;
    const iframeDoc = previewFrame.contentDocument || previewFrame.contentWindow.document;
    iframeDoc.body.innerHTML = historyStack[historyIndex];
  }
}

function redo() {
  if (historyIndex < historyStack.length - 1) {
    historyIndex++;
    const iframeDoc = previewFrame.contentDocument || previewFrame.contentWindow.document;
    iframeDoc.body.innerHTML = historyStack[historyIndex];
  }
}

// --- Keyboard shortcuts ---
document.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.key === "z") {
    e.preventDefault();
    undo();
  } else if (e.ctrlKey && e.key === "y") {
    e.preventDefault();
    redo();
  }
});

// --- Event listeners ---
textTool.addEventListener("click", () => {
  if (activeTool === "text") deactivateAllTools();
  else { deactivateAllTools(); activeTool = "text"; textTool.classList.add("active-tool"); }
});

selectTool.addEventListener("click", () => {
  if (activeTool === "select") deactivateAllTools();
  else { deactivateAllTools(); activeTool = "select"; selectTool.classList.add("active-tool"); }
});

undoBtn.addEventListener("click", undo);
redoBtn.addEventListener("click", redo);

// --- Iframe logic ---
previewFrame.addEventListener("load", () => {
  const iframeDoc = previewFrame.contentDocument || previewFrame.contentWindow.document;
  saveHistory();

  iframeDoc.addEventListener("click", (e) => {
    const el = e.target;

    // --- Text Tool ---
    if (activeTool === "text") {
      const newText = iframeDoc.createElement("div");
      newText.textContent = "Type here...";
      newText.contentEditable = "true";
      newText.dataset.editable = "true";
      newText.style.position = "absolute";
      newText.style.left = e.pageX + "px";
      newText.style.top = e.pageY + "px";
      newText.style.fontSize = "16px";
      newText.style.color = "black";
      newText.style.outline = "none";
      newText.style.cursor = "text";

      iframeDoc.body.appendChild(newText);
      newText.focus();

      saveHistory();
      deactivateAllTools();
      return;
    }

    // --- Select Tool ---
    if (activeTool === "select") {
      e.preventDefault(); 
      e.stopPropagation();

      if (selectedElement) {
        selectedElement.style.outline = "none";
        removeHandles(iframeDoc);
      }

      if (
        (el.dataset.editable === "true") ||
        el.tagName === "BUTTON" ||
        el.tagName === "IMG" ||
        el.classList.contains("slideshow-container") ||
        el.tagName === "DIV" ||
        ["P", "H1", "H2", "H3", "H4", "H5", "H6", "SPAN", "A", "LABEL"].includes(el.tagName)
      ) {
        selectedElement = el;
        selectedElement.style.outline = "2px dashed red";
        makeResizable(selectedElement, iframeDoc);

        if (["P","H1","H2","H3","H4","H5","H6","SPAN","A","LABEL"].includes(el.tagName)) {
          selectedElement.contentEditable = "true";
          selectedElement.dataset.editable = "true";
          selectedElement.focus();
          selectedElement.addEventListener("blur", () => saveHistory(), { once: true });
        }
      }
    }
  });
});

// --- Resizing ---
function removeHandles(doc) { doc.querySelectorAll(".resize-handle").forEach(h => h.remove()); }

function makeResizable(el, doc) {
  removeHandles(doc);
  const handle = doc.createElement("div");
  handle.className = "resize-handle";
  handle.style.width = "10px";
  handle.style.height = "10px";
  handle.style.background = "red";
  handle.style.position = "absolute";
  handle.style.right = "0";
  handle.style.bottom = "0";
  handle.style.cursor = "se-resize";
  handle.style.zIndex = "9999";

  if (getComputedStyle(el).position === "static") el.style.position = "relative";
  el.appendChild(handle);

  let isResizing = false;

  handle.addEventListener("mousedown", (e) => {
    e.preventDefault(); e.stopPropagation();
    isResizing = true;
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = parseInt(getComputedStyle(el).width, 10);
    const startHeight = parseInt(getComputedStyle(el).height, 10);

    function resizeMove(ev) {
      if (!isResizing) return;
      el.style.width = startWidth + (ev.clientX - startX) + "px";
      el.style.height = startHeight + (ev.clientY - startY) + "px";
    }

    function stopResize() {
      if (isResizing) saveHistory();
      isResizing = false;
      doc.removeEventListener("mousemove", resizeMove);
      doc.removeEventListener("mouseup", stopResize);
    }

    doc.addEventListener("mousemove", resizeMove);
    doc.addEventListener("mouseup", stopResize);
  });
}
// --- Publish / Save Website ---
async function publishProject() {
  const iframeDoc = previewFrame.contentDocument || previewFrame.contentWindow.document;

  // Collect main files
  const html = iframeDoc.documentElement.outerHTML;
  const css = Array.from(iframeDoc.querySelectorAll("style"))
    .map(style => style.innerHTML)
    .join("\n");
  const js = Array.from(iframeDoc.querySelectorAll("script"))
    .map(script => script.innerHTML)
    .join("\n");

  // Optional extra pages
  const buynow = iframeDoc.querySelector("#buynowPage")?.outerHTML || "";
  const product = iframeDoc.querySelector("#productPage")?.outerHTML || "";

  // Collect images (base64)
  const images = Array.from(iframeDoc.querySelectorAll("img")).map((img, i) => {
    if (img.src.startsWith("data:image")) {
      return {
        name: `image${i}.png`,
        data: img.src.split(",")[1] // remove "data:image/png;base64,"
      };
    }
    return null;
  }).filter(Boolean);

  // Send to server
  try {
    const res = await fetch("https://onkaanpublishprototype-7.onrender.com/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectName: "MyWebsite",
        html,
        css,
        js,
        buynow,
        product,
        images
      })
    });

    const result = await res.json();
    if (result.success) {
      alert("✅ Website files sent to Gmail!");
    } else {
      alert("❌ Failed to publish: " + result.message);
    }
  } catch (err) {
    console.error("Publish error:", err);
    alert("❌ Error connecting to server.");
  }
}

