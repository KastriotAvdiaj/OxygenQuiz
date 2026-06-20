const AVATAR_COLORS = [
  "bg-blue-500",
  "bg-primary",
  "bg-pink-500",
  "bg-orange-500",
  "bg-teal-500",
  "bg-indigo-500",
] as const;

export const getAvatarColor = (name: string): string => {
  if (!name) return AVATAR_COLORS[0];
  const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
};
