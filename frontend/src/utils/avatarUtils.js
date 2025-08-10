export const generateAvatar = (username, avatarColor) => {
  if (!username) return { initials: "", color: avatarColor || "#cccccc" };

  const words = username.trim().split(/\s+/);
  let initials = "";

  if (words.length === 1) {
    initials = words[0][0]?.toUpperCase() || "";
  } else if (words.length >= 2) {
    initials =
      (words[0][0]?.toUpperCase() || "") + (words[1][0]?.toUpperCase() || "");
  }

  const color = avatarColor || "#cccccc";

  return { initials, color };
};
