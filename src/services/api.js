export const getPlayer = async (tag) => {
  const cleanTag = tag.replace("#", ""); 

  // Replace 192.168.1.XX with YOUR actual IP from ipconfig
  console.log(process.env.REACT_APP_API_URL);
  const res = await fetch(`${process.env.REACT_APP_API_URL}/api/player/${cleanTag}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "API error");
  }

  return res.json();
};