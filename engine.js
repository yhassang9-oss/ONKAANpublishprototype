// ----------------- Engine.js Fixed -----------------
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

// Per-page persistence
let pages = {};
let currentPage = "index"; // default page

// ---------------- Helper ----------------
// Use iframe if exists, else fall back to document
function getDoc() {
  return previewFrame ? (previewFrame.contentDocument || previewFrame.contentWindow.document) : document;
}

// ---------------- History ----------------
function saveHistory() {
  const doc = getDoc();
  if (!doc) return;
  const indexContent = doc.querySelector("#index")?.innerHTML || "";
  pages[currentPage] = indexContent;

  historyStack = historyStack.slice(0, historyIndex + 1);
  historyStack.push(doc.body.innerHTML);
  historyIndex++;

  localStorage.setItem("userTemplateDraft", JSON.stringify(pages));
}

function undo() {
  if (historyIndex > 0) {
    historyIndex--;
    const doc = getDoc();
    if (!doc) return;
    doc.body.innerHTML = historyStack[historyIndex];
  }
}

function redo() {
  if (historyIndex < historyStack.length - 1) {
    historyIndex++;
    const doc = getDoc();
    if (!doc) return;
    doc.body.innerHTML = historyStack[historyIndex];
  }
}

// ---------------- Tools ----------------
function deactivateAllTools() {
  activeTool = null;
  textTool?.classList.remove("active-tool");
  selectTool?.classList.remove("active-tool");

  if (selectedElement) {
    selectedElement.style.outline = "none";
    removeHandles(getDoc());
    selectedElement = null;
  }

  if (colorPanel) { colorPanel.remove(); colorPanel = null; }
  if (buttonPanel) { buttonPanel.style.display = "none"; }
}

// ---------------- Text Tool ----------------
textTool?.addEventListener("click", () => {
  if (activeTool === "text") deactivateAllTools();
  else { deactivateAllTools(); activeTool = "text"; textTool.classList.add("active-tool"); }
});

// ---------------- Select Tool ----------------
selectTool?.addEventListener("click", () => {
  if (activeTool === "select") deactivateAllTools();
  else { deactivateAllTools(); activeTool = "select"; selectTool.classList.add("active-tool"); }
});

// ---------------- Undo/Redo ----------------
undoBtn?.addEventListener("click", undo);
redoBtn?.addEventListener("click", redo);
document.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.key === "z") { e.preventDefault(); undo(); }
  else if (e.ctrlKey && e.key === "y") { e.preventDefault(); redo(); }
});

// ---------------- Color Tool ----------------
colorTool?.addEventListener("click", () => {
  if (!selectedElement) { alert("Select an element first!"); return; }
  const doc = getDoc();
  if (!doc) return;

  if (colorPanel) { colorPanel.remove(); colorPanel = null; return; }

  colorPanel = doc.createElement("div");
  colorPanel.style.cssText = "position:fixed;top:20px;left:20px;background:#fff;border:1px solid #ccc;padding:10px;display:grid;grid-template-columns:repeat(8,30px);grid-gap:5px;z-index:9999";

  const colors = ["#000000","#808080","#C0C0C0","#FFFFFF","#800000","#FF0000","#808000","#FFFF00","#008000","#00FF00","#008080","#00FFFF","#000080","#0000FF","#800080","#FF00FF"];
  colors.forEach(c => {
    const swatch = doc.createElement("div");
    swatch.style.cssText = `width:30px;height:30px;background:${c};cursor:pointer;border:1px solid #555`;
    swatch.addEventListener("click", () => {
      if (!selectedElement) return;
      if (selectedElement.dataset.editable === "true") selectedElement.style.color = c;
      else selectedElement.style.backgroundColor = c;
      saveHistory();
    });
    colorPanel.appendChild(swatch);
  });
  doc.body.appendChild(colorPanel);
});

// ---------------- Image Tool ----------------
imageTool?.addEventListener("click", () => {
  if (!selectedElement || !(selectedElement.tagName === "IMG" || selectedElement.classList.contains("slideshow-container"))) {
    alert("Select an image or slideshow first."); return;
  }
  const input = document.createElement("input");
  input.type = "file"; input.accept = "image/*"; input.click();
  input.onchange = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (selectedElement.tagName === "IMG") selectedElement.src = ev.target.result;
      else if (selectedElement.classList.contains("slideshow-container")) {
        const firstSlide = selectedElement.querySelector(".slide");
        if (firstSlide) firstSlide.src = ev.target.result;
      }
      saveHistory();
    };
    reader.readAsDataURL(file);
  };
});

// ---------------- Button Tool ----------------
buttonTool?.addEventListener("click", () => {
  if (!selectedElement || selectedElement.tagName !== "BUTTON") { alert("Select a button first!"); return; }
  const doc = getDoc();
  if (!doc) return;

  if (!buttonPanel) {
    buttonPanel = doc.createElement("div");
    buttonPanel.id = "buttonDesignPanel";
    buttonPanel.style.cssText = "position:fixed;top:50px;left:20px;background:#fff;border:1px solid #ccc;padding:10px;z-index:9999";
    buttonPanel.innerHTML = `
      <h3>Buy Now Designs</h3>
      <div class="designs">
        <button class="buyDesign1">1</button>
        <button class="buyDesign2">2</button>
        <button class="buyDesign3">3</button>
        <button class="buyDesign4">4</button>
        <button class="buyDesign5">5</button>
      </div>
      <h3>Add to Cart Designs</h3>
      <div class="designs">
        <button class="addDesign1">1</button>
        <button class="addDesign2">2</button>
        <button class="addDesign3">3</button>
        <button class="addDesign4">4</button>
        <button class="addDesign5">5</button>
      </div>`;
    doc.body.appendChild(buttonPanel);

    buttonPanel.querySelectorAll(".designs button").forEach(btn => {
      btn.addEventListener("click", () => {
        if (!selectedElement) return;
        selectedElement.className = btn.className;
        saveHistory();
      });
    });
  } else buttonPanel.style.display = buttonPanel.style.display === "none" ? "block" : "none";
});

// ---------------- Add Product Box ----------------
addProductBoxBtn?.addEventListener("click", () => {
  const doc = getDoc();
  if (!doc) return;
  const container = doc.querySelector(".product-container");
  if (!container) { alert("No product container found!"); return; }
  const lastBox = container.querySelector(".product-box:last-child");
  if (!lastBox) { alert("No product box found!"); return; }
  const clone = lastBox.cloneNode(true);
  container.appendChild(clone);
  saveHistory();
});

// ---------------- Resizing ----------------
function removeHandles(doc) { doc.querySelectorAll(".resize-handle").forEach(h => h.remove()); }
function makeResizable(el, doc) {
  removeHandles(doc);
  const handle = doc.createElement("div");
  handle.className = "resize-handle";
  handle.style.cssText = "width:10px;height:10px;background:red;position:absolute;right:0;bottom:0;cursor:se-resize;z-index:9999";
  el.style.position = "relative"; el.appendChild(handle);

  let isResizing = false;
  handle.addEventListener("mousedown", (e) => {
    e.preventDefault(); e.stopPropagation();
    isResizing = true;
    const startX = e.clientX, startY = e.clientY;
    const startWidth = parseInt(getComputedStyle(el).width,10);
    const startHeight = parseInt(getComputedStyle(el).height,10);

    function resizeMove(ev) {
      if (!isResizing) return;
      el.style.width = startWidth + (ev.clientX - startX) + "px";
      el.style.height = startHeight + (ev.clientY - startY) + "px";
    }
    function stopResize() { if (isResizing) saveHistory(); isResizing = false; doc.removeEventListener("mousemove", resizeMove); doc.removeEventListener("mouseup", stopResize); }

    doc.addEventListener("mousemove", resizeMove);
    doc.addEventListener("mouseup", stopResize);
  });
}

// ---------------- Selectable Elements ----------------
function attachClickEvents() {
  const doc = getDoc();
  if (!doc) return;
  doc.addEventListener("click", (e) => {
    const el = e.target;
    if (activeTool === "text") {
      const newText = doc.createElement("div");
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
      doc.body.appendChild(newText);
      newText.focus();
      saveHistory();
      deactivateAllTools();
      return;
    }

    if (activeTool === "select") {
      e.preventDefault(); e.stopPropagation();
      if (selectedElement) { selectedElement.style.outline="none"; removeHandles(doc); }
      if (
        el.dataset.editable==="true" ||
        el.tagName==="BUTTON" ||
        el.tagName==="IMG" ||
        el.classList.contains("slideshow-container") ||
        el.tagName==="DIV" ||
        ["P","H1","H2","H3","H4","H5","H6","SPAN","A","LABEL","HEADER","FOOTER"].includes(el.tagName)
      ) {
        selectedElement = el;
        selectedElement.style.outline = "2px dashed red";
        makeResizable(selectedElement, doc);
        if (["P","H1","H2","H3","H4","H5","H6","SPAN","A","LABEL"].includes(el.tagName)) {
          selectedElement.contentEditable = "true";
          selectedElement.dataset.editable = "true";
          selectedElement.focus();
          selectedElement.addEventListener("blur", ()=> saveHistory(), {once:true});
        }
      }
      return;
    }
  });
}

// ---------------- Init ----------------
window.addEventListener("load", () => {
  const saved = localStorage.getItem("userTemplateDraft");
  if (saved) pages = JSON.parse(saved);
  attachClickEvents();
});
