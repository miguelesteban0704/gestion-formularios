export function countFormVisibility(forms = []) {
  const counts = { public: 0, unlisted: 0, private: 0 };

  for (const form of forms) {
    const visibility = form?.visibility || "public";
    if (visibility === "unlisted") counts.unlisted += 1;
    else if (visibility === "private") counts.private += 1;
    else counts.public += 1;
  }

  return counts;
}
