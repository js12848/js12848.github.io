// Get elements
const peaceFill = document.getElementById("peaceFill");
const peacePercent = document.getElementById("peacePercent");
const commentList = document.getElementById("commentList");
const postCountLabel = document.getElementById("postCountLabel");

// Count initial comments
let totalComments = 0;
let deletedComments = 0;

function updateCounts() {
  if (!commentList) return;
  const currentComments = commentList.querySelectorAll(".comment").length;
  // totalComments stays as original for percent, but we show current count in label
  if (postCountLabel) {
    postCountLabel.textContent =
      currentComments + (currentComments === 1 ? " post" : " posts");
  }
}

if (commentList) {
  totalComments = commentList.querySelectorAll(".comment").length;
}

// Function to update peacefulness based on deleted comments
function updatePeacefulness() {
  if (!totalComments) return;

  const ratio = deletedComments / totalComments;
  const percent = Math.round(ratio * 100);

  peaceFill.style.height = `${percent}%`;
  peacePercent.textContent = percent;
}

// Event delegation for delete buttons
if (commentList) {
  commentList.addEventListener("click", (event) => {
    const target = event.target;

    if (target.classList.contains("delete-btn")) {
      const commentItem = target.closest(".comment");
      if (commentItem) {
        commentItem.remove();
        deletedComments = Math.min(deletedComments + 1, totalComments);
        updatePeacefulness();
        updateCounts();
      }
    }
  });
}

// Initialize
updatePeacefulness();
updateCounts();
