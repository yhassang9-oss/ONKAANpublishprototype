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

// --- State ---
let activeTool = null;
let selectedElement = null;
let historyStack = [];
let historyIndex = -1;
let colorPanel = null;
let buttonPanel = null;

// --- Per-page persistence ---
let pages = {};
let currentPage = "index";

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

// --- Add Product Box ---
addProductBoxBtn.addEventListener("click", () => {
  const iframeDoc = previewFrame.contentDocument || previewFrame.contentWindow.document;
  if (!iframeDoc) return;

  const container = iframeDoc.querySelector(".product-container");
  if (!container) { alert("No product container found!"); return; }

  const lastBox = container.querySelector(".product-box:last-child");
  if (!lastBox) { alert("No product box found!"); return; }

  const clone = lastBox.cloneNode(true);
  container.appendChild(clone);
  saveHistory();
});

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

// --- History ---
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

// --- Resizing ---
function removeHandles(doc) { doc.querySelectorAll(".resize-handle").forEach(h => h.remove()); }
function makeResizable(el, doc) {
  removeHandles(doc);
  const handle = doc.createElement("div");
  handle.className = "resize-handle";
  Object.assign(handle.style, {
    width:"10px", height:"10px", background:"red",
    position:"absolute", right:"0", bottom:"0",
    cursor:"se-resize", zIndex:9999
  });
  el.style.position = "relative";
  el.appendChild(handle);

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

// --- Color Tool ---
colorTool.addEventListener("click", () => {
  if (!selectedElement) { alert("Select an element first!"); return; }
  const iframeDoc = previewFrame.contentDocument || previewFrame.contentWindow.document;
  if (!iframeDoc) return;

  if (colorPanel) { colorPanel.remove(); colorPanel = null; return; }

  colorPanel = iframeDoc.createElement("div");
  Object.assign(colorPanel.style, {
    position:"fixed", top:"20px", left:"20px",
    background:"#fff", border:"1px solid #ccc", padding:"10px",
    display:"grid", gridTemplateColumns:"repeat(8,30px)", gridGap:"5px", zIndex:9999
  });

  const colors = ["#000000","#808080","#C0C0C0","#FFFFFF","#800000","#FF0000","#808000","#FFFF00","#008000","#00FF00","#008080","#00FFFF","#000080","#0000FF","#800080","#FF00FF"];
  colors.forEach(c => {
    const swatch = iframeDoc.createElement("div");
    Object.assign(swatch.style, {width:"30px", height:"30px", background:c, cursor:"pointer", border:"1px solid #555"});
    swatch.addEventListener("click", () => {
      if (!selectedElement) return;
      if (selectedElement.dataset.editable === "true") selectedElement.style.color = c;
      else selectedElement.style.backgroundColor = c;
      saveHistory();
    });
    colorPanel.appendChild(swatch);
  });

  iframeDoc.body.appendChild(colorPanel);
});

// --- Image Tool ---
imageTool.addEventListener("click", () => {
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

// --- Button Tool ---
buttonTool.addEventListener("click", () => {
  if (!selectedElement || selectedElement.tagName !== "BUTTON") { alert("Select a button first!"); return; }
  const iframeDoc = previewFrame.contentDocument || previewFrame.contentWindow.document;
  if (!iframeDoc) return;

  if (!buttonPanel) {
    buttonPanel = iframeDoc.createElement("div");
    buttonPanel.id = "buttonDesignPanel";
    Object.assign(buttonPanel.style, {position:"fixed", top:"50px", left:"20px", background:"#fff", border:"1px solid #ccc", padding:"10px", zIndex:9999});
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
    iframeDoc.body.appendChild(buttonPanel);

    buttonPanel.querySelectorAll(".designs button").forEach(btn => {
      btn.addEventListener("click", () => {
        if (!selectedElement) return;
        selectedElement.className = btn.className;
        saveHistory();
      });
    });
  } else {
    buttonPanel.style.display = buttonPanel.style.display === "none" ? "block" : "none";
  }
});

// --- Publish ---
async function fetchAndInlineCSS(baseUrl, cssHref) {
  try {
    const response = await fetch(`${baseUrl}/${cssHref}`);
    if (!response.ok) {
      console.warn(`Failed to fetch CSS: ${cssHref} (Status: ${response.status})`);
      return '';
    }
    const cssText = await response.text();
    return `<style>${cssText}</style>`;
  } catch (error) {
    console.error(`Error loading CSS from ${cssHref}:`, error);
    return '';
  }
}

publishBtn.addEventListener("click", () => {
  const iframeDoc = previewFrame.contentDocument || previewFrame.contentWindow.document;
  const htmlContent = "<!DOCTYPE html>\n" + iframeDoc.documentElement.outerHTML;

  let cssContent = "";
  iframeDoc.querySelectorAll("style").forEach(tag => cssContent += tag.innerHTML + "\n");

  let jsContent = "";
  iframeDoc.querySelectorAll("script").forEach(tag => jsContent += tag.innerHTML + "\n");

  const images = [];
  iframeDoc.querySelectorAll("img").forEach((img, i) => {
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);
      const dataUrl = canvas.toDataURL("image/png");
      images.push({ name: `image${i + 1}.png`, data: dataUrl.split(",")[1] });
    } catch (err) {
      console.warn("Skipping image (CORS issue):", img.src);
    }
  });

  fetch("https://onkaanpublishprototype-17.onrender.com/publish", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      projectName: "MyProject",
      html: htmlContent,
      css: cssContent,
      js: jsContent,
      images
    })
  })
  .then(res => res.json())
  .then(data => alert(data.message))
  .catch(err => alert("Error sending files: " + err));
});

// --- Save Draft ---
savePageBtn.addEventListener("click", () => {
  const iframeDoc = previewFrame.contentDocument || previewFrame.contentWindow.document;
  if (!iframeDoc) return;

  const editable = iframeDoc.querySelector("#index");
  if (editable) {
    pages[currentPage] = editable.innerHTML;
    localStorage.setItem("userTemplateDraft", JSON.stringify(pages));
    alert("Draft saved locally!");
  }
});

// --- Page switching ---
document.querySelectorAll(".page-box").forEach(box => {
  box.addEventListener("click", () => {
    const iframeDoc = previewFrame.contentDocument || previewFrame.contentWindow.document;
    if (iframeDoc) {
      const editable = iframeDoc.querySelector("#index");
      if (editable) pages[currentPage] = editable.innerHTML;
    }
    localStorage.setItem("userTemplateDraft", JSON.stringify(pages));

    currentPage = box.getAttribute("data-page"); // "index" or "product"

    fetch(`templates/${currentPage}.html`)
      .then(res => res.text())
      .then(async html => {
        const cssMatch = html.match(/<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["']/i);
        const cssHref = cssMatch ? cssMatch[1] : 'style.css';
        const baseUrl = `${window.location.origin}/templates`;
        const inlinedCSS = await fetchAndInlineCSS(baseUrl, cssHref);

        previewFrame.srcdoc = `
          <!DOCTYPE html>
          <html>
            <head>
              <base href="${baseUrl}/">
              ${inlinedCSS}
            </head>
            <body>${html}</body>
          </html>`;
        previewFrame.onload = () => {
          const iframeDoc = previewFrame.contentDocument || previewFrame.contentWindow.document;
          if (pages[currentPage]) {
            const editable = iframeDoc.querySelector("#index");
            if (editable) editable.innerHTML = pages[currentPage];
          }
          attachIframeEvents();
        };
      })
      .catch(err => {
        console.error('Error loading template:', err);
        alert('Failed to load template. Check console for details.');
      });
  });
});

// --- Window load: restore saved pages ---
window.addEventListener("load", () => {
  const saved = localStorage.getItem("userTemplateDraft");
  if (saved) pages = JSON.parse(saved);

  fetch(`templates/${currentPage}.html`)
    .then(res => res.text())
    .then(async html => {
      const cssMatch = html.match(/<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["']/i);
      const cssHref = cssMatch ? cssMatch[1] : 'style.css';
      const baseUrl = `${window.location.origin}/templates`;
      const inlinedCSS = await fetchAndInlineCSS(baseUrl, cssHref);

      previewFrame.srcdoc = `
        <!DOCTYPE html>
        <html>
          <head>
            <base href="${baseUrl}/">
            ${inlinedCSS}
          </head>
          <body>${html}</body>
        </html>`;
      previewFrame.onload = () => {
        const iframeDoc = previewFrame.contentDocument || previewFrame.contentWindow.document;
        if (pages[currentPage]) {
          const editable = iframeDoc.querySelector("#index");
          if (editable) editable.innerHTML = pages[currentPage];
        }
        attachIframeEvents();
      };
    })
    .catch(err => {
      console.error('Error loading initial template:', err);
      alert('Failed to load initial template. Check console for details.');
    });
});
