// Slideshow functions (if you have multiple images)
let slideIndex = 1;
showSlide(slideIndex);

function changeSlide(n) {
    showSlide(slideIndex += n);
}

function showSlide(n) {
    const slides = document.getElementsByClassName("slide");
    if (slides.length === 0) return; // no slides

    if (n > slides.length) slideIndex = 1;
    if (n < 1) slideIndex = slides.length;

    for (let i = 0; i < slides.length; i++) {
        slides[i].style.display = "none";
    }
    slides[slideIndex - 1].style.display = "block";
}
window.addEventListener("load", () => {
  // Notify parent editor that iframe is ready
  if (window.parent && window.parent.onIframeLoaded) {
    window.parent.onIframeLoaded();
  }

  // Optional: autosave content to localStorage per page
  const page = window.location.pathname.split("/").pop().replace(".html","");
  const saved = localStorage.getItem("userTemplateDraft");
  if (saved) {
    const pages = JSON.parse(saved);
    if (pages[page]) {
      document.documentElement.innerHTML = pages[page];
    }
  }

  // Listen for edits (contentEditable changes)
  document.addEventListener("input", () => {
    const saved = localStorage.getItem("userTemplateDraft");
    const pages = saved ? JSON.parse(saved) : {};
    pages[page] = document.documentElement.outerHTML;
    localStorage.setItem("userTemplateDraft", JSON.stringify(pages));
  });
});


