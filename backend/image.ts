const STYLE_CONFIG: Record<string, { checkpoint: string; negative?: string }> = {
  anthro: { checkpoint: 'furrytoonmix_xlIllustriousV2.safetensors', negative: 'human, realistic, photorealistic, real person' },
  anime: { checkpoint: 'dreamshaper_8.safetensors', negative: 'realistic, photorealistic, human, lowres' },
  photo: { checkpoint: 'cyberrealistic_v90.safetensors', negative: 'cartoon, anime, illustration, lowres' },
  epic: { checkpoint: 'epicrealismXL_pureFix.safetensors', negative: 'cartoon, lowres, bad anatomy' },
  toon: { checkpoint: 'revAnimated_v2Rebirth.safetensors', negative: 'realistic, photo, human' },
  dnd: { checkpoint: 'dndCoverArt_v10.safetensors', negative: 'realistic, lowres, photo' },
  cyber: { checkpoint: 'cyberrealistic_v90.safetensors', negative: '' }
};

export async function generateImage(styleKey: string, body: any) {
  const style = STYLE_CONFIG[styleKey];
  if (!style) throw new Error('Unknown image style');

  const res = await fetch('http://127.0.0.1:7860/sdapi/v1/txt2img', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, override_settings: { sd_model_checkpoint: style.checkpoint }, negative_prompt: style.negative || '' })
  });

  return await res.json().catch(() => ({}));
}
