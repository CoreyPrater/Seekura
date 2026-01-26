import { STYLE_CONFIG, LORA_PROFILES } from "./styles.js";

export function buildPrompt(prompt, styleKey){
  const lower = prompt.toLowerCase();
  let loraText = "";
  const style = STYLE_CONFIG[styleKey];
  let negatives = [style?.negative || ""];

  LORA_PROFILES.forEach(profile => {
    if(profile.keywords.some(k => lower.includes(k))){
      profile.loras.forEach(l => loraText += ` <lora:${l.name}:${l.weight}>`);
      if(profile.negative) negatives.push(profile.negative);
    }
  });

  return {
    prompt: prompt + loraText,
    negative_prompt: negatives.join(", ")
  };
}
