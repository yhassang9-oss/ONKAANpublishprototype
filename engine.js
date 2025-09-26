// --- Elements ---
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
const saveBtn = document.getElementById("save-btn");
const pageButtonsContainer = document.getElementById("pageButtonsContainer");

// Page buttons
const pageButtons = document.querySelectorAll("#pageButtonsContainer .page-btn");

// --- State ---
let currentPage = "index";
let activeTool = null;
let selectedElement = null;
let historyStack = [];
let historyIndex = -1;
let colorPanel = null;
let buttonPanel = null;
let pages = {}; // per-page persistence

// --- Page Switching ---
pageButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const page = btn.getAttribute("data-page");
    currentPage = page;

    // Update active style
    pageButtons.forEach(b => b.classList.remove("active-page"));
    btn.classList.add("active-page");

    // Hide hamburger
    pageButtonsContainer.style.display = "none";

    // Load iframe
    previewFrame.src = `templates/${page}.html`;
    previewFrame.onload = () => {
      attachIframeEvents();
      if (pages[currentPage]) {
        const iframeDoc = previewFrame.contentDocument || previewFrame.contentWindow.document;
        const editable = iframeDoc.querySelector("#index");
        if (editable) editable.innerHTML = pages[currentPage];
      }
    };
  });
});

// --- Hamburger Toggle ---
saveBtn.addEventListener("click", () => {
  if (pageButtonsContainer.style.display === "none" || pageButtonsContainer.style.display === "") {
    pageButtonsContainer.style.display = "flex";
  } else {
    pageButtonsContainer.style.display = "none";
  }
});

// --- Attach Iframe Events ---
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
      newText.contentEditable = true;
      newText.dataset.editable = "true";
      Object.assign(newText.style, {
        position: "absolute",
        left: e.pageX + "px",
        top: e.pageY + "px",
        fontSize: "16px",
        color: "black",
        outline: "none",
        cursor: "text"
      });
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

      if (
        el.dataset.editable === "true" ||
        el.tagName === "BUTTON" ||
        el.tagName === "IMG" ||
        el.classList.contains("slideshow-container") ||
        el.tagName === "DIV" ||
        ["P","H1","H2","H3","H4","H5","H6","SPAN","A","LABEL"].includes(el.tagName)
      ) {
        selectedElement = el;
        selectedElement.style.outline = "2px dashed red";
        makeResizable(selectedElement, iframeDoc);

        if (["P","H1","H2","H3","H4","H5","H6","SPAN","A","LABEL"].includes(el.tagName)) {
          selectedElement.contentEditable = true;
          selectedElement.dataset.editable = "true";
          selectedElement.focus();
          selectedElement.addEventListener("blur", () => saveHistory(), { once: true });
        }
      }
    }
  });
}

// --- Tool Toggle ---
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

textTool.addEventListener("click", () => {
  if (activeTool === "text") deactivateAllTools();
  else { deactivateAllTools(); activeTool = "text"; textTool.classList.add("active-tool"); }
});

selectTool.addEventListener("click", () => {
  if (activeTool === "select") deactivateAllTools();
  else { deactivateAllTools(); activeTool = "select"; selectTool.classList.add("active-tool"); }
});

// --- Undo / Redo ---
function saveHistory() {
  const iframeDoc = previewFrame.contentDocument || previewFrame.contentWindow.document;
  if (!iframeDoc) return;

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

undoBtn.addEventListener("click", undo);
redoBtn.addEventListener("click", redo);
document.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.key === "z") { e.preventDefault(); undo(); }
  else if (e.ctrlKey && e.key === "y") { e.preventDefault(); redo(); }
});

// --- Load initial template ---
window.addEventListener("load", () => {
  const saved = localStorage.getItem("userTemplateDraft");
  if (saved) pages = JSON.parse(saved);

  previewFrame.src = `templates/${currentPage}.html`;
  previewFrame.onload = () => {
    const iframeDoc = previewFrame.contentDocument || previewFrame.contentWindow.document;
    if (pages[currentPage]) {
      const editable = iframeDoc.querySelector("#index");
      if (editable) editable.innerHTML = pages[currentPage];
    }
    attachIframeEvents();
  };
});
