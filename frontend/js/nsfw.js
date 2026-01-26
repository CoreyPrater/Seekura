let terms=[];

fetch("/assets/nsfw_terms.txt")
  .then(r=>r.text())
  .then(t=>terms=t.split(/\r?\n/).filter(Boolean));

export function isNSFW(prompt){
  return terms.some(t=>prompt.toLowerCase().includes(t));
}
