const textTool = document.getElementById("textTool");
const selectTool = document.getElementById("selecttool");
const undoBtn = document.getElementById("undo");
const redoBtn = document.getElementById("redo");
const colorTool = document.getElementById("color");
const imageTool = document.getElementById("image");
const buttonTool = document.getElementById("Buttons");
const previewFrame = document.getElementById("previewFrame");
const publishBtn = document.getElementById("publish");
const resetTool = document.getElementById("resetTool");
const savePageBtn = document.getElementById("savePageBtn");
const addProductBoxBtn = document.getElementById("addproductbox");

let activeTool = null;
let selectedElement = null;
let historyStack = [];
let historyIndex = -1;
let colorPanel = null;
let buttonPanel = null;

// --- Per-page persistence ---
let pages = {};
let currentPage = "index"; // default = index.html

// --- Helper: attach iframe events ---
function attachIframeEvents() {
  const iframeDoc = previewFrame.contentDocument || previewFrame.contentWindow.document;
  if (!iframeDoc) return;

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
      if (selectedElement) { selectedElement.style.outline = "none"; removeHandles(iframeDoc); }

      // ✅ Prevent selection of header and footer
      if (
        el.dataset.editable === "true" ||
        el.tagName === "BUTTON" ||
        el.tagName === "IMG" ||
        el.classList.contains("slideshow-container") ||
        (el.tagName === "DIV" && el.id !== "header" && el.id !== "footer1") ||
        ["P","H1","H2","H3","H4","H5","H6","SPAN","A","LABEL"].includes(el.tagName)
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
      return;
    }
  });
}

// --- Add Product Box ---
addProductBoxBtn.addEventListener("click", () => {
  const iframeDoc = previewFrame.contentDocument || previewFrame.contentWindow.document;
  if (!iframeDoc) return;

  const container = iframeDoc.querySelector(".product-container");
  if (!container) { alert("No product container found in the template!"); return; }

  const lastBox = container.querySelector(".product-box:last-child");
  if (!lastBox) { alert("No product box found in the template!"); return; }

  const clone = lastBox.cloneNode(true);
  container.appendChild(clone);
  saveHistory();
});

// --- Tool toggle ---
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

// --- History ---
function saveHistory() {
  const iframeDoc = previewFrame.contentDocument || previewFrame.contentWindow.document;
  if (!iframeDoc) return;

  // ✅ Only save #index content
  pages[currentPage] = iframeDoc.querySelector("#index")?.innerHTML || "";

  historyStack = historyStack.slice(0, historyIndex + 1);
  historyStack.push(iframeDoc.body.innerHTML);
  historyIndex++;

  localStorage.setItem("userTemplateDraft", JSON.stringify(pages));
}

function undo() {
  if (historyIndex > 0) {
    historyIndex--;
    const iframeDoc = previewFrame.contentDocument || previewFrame.contentWindow.document;
    if (!iframeDoc) return;
    iframeDoc.body.innerHTML = historyStack[historyIndex];
  }
}

function redo() {
  if (historyIndex < historyStack.length - 1) {
    historyIndex++;
    const iframeDoc = previewFrame.contentDocument || previewFrame.contentWindow.document;
    if (!iframeDoc) return;
    iframeDoc.body.innerHTML = historyStack[historyIndex];
  }
}

// --- Keyboard shortcuts ---
document.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.key === "z") { e.preventDefault(); undo(); }
  else if (e.ctrlKey && e.key === "y") { e.preventDefault(); redo(); }
});

// --- Tool buttons ---
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

// --- Resizing ---
function removeHandles(doc) { doc.querySelectorAll(".resize-handle").forEach(h => h.remove()); }
function makeResizable(el, doc) {
  removeHandles(doc);
  const handle = doc.createElement("div");
  handle.className = "resize-handle";
  handle.style.cssText = "width:10px;height:10px;background:red;position:absolute;right:0;bottom:0;cursor:se-resize;z-index:9999";
  el.style.position = "relative"; el.appendChild(handle);

  let isResizing = false;
  handle.addEventListener("mousedown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    isResizing = true;
    const startX = e.clientX, startY = e.clientY;
    const startWidth = parseInt(getComputedStyle(el).width,10);
    const startHeight = parseInt(getComputedStyle(el).height,10);

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

// --- Color, Image, Button, Publish, Save logic ---
// (keep the rest of your code unchanged)
