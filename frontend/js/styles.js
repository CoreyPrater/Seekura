export const STYLE_CONFIG = {
  anime: { label:"Anime", negative:"photorealistic, realistic, photo", endpoint:"/generate/anime" },
  photo: { label:"Photorealistic", negative:"anime, cartoon, illustration", endpoint:"/generate/photo" },
  epic:  { label:"Epic Fantasy", negative:"lowres, blurry, bad anatomy", endpoint:"/generate/epic" },
  toon:  { label:"Toon", negative:"realistic, photo", endpoint:"/generate/toon" },
  dnd:   { label:"D&D Art", negative:"photorealistic, portrait, people", endpoint:"/generate/dnd" },
  cyber: { 
    label:"Cyberpunk", 
    negative:"lowres, blurry, bad anatomy, oversaturated, cartoonish, unrealistic, glitch, watermark", 
    endpoint:"/generate/cyber" 
  },
  dndCoverArt_V10: {
    label:"D&DCoverArt",
    negative:"lowres, blurry, cartoon, modern, photorealistic, poor composition, bad anatomy, watermark",
    endpoint:"/generate/dndCoverArt_V10"
  }
};

export const LORA_PROFILES = [
  {
    keywords:["map","isometric","dungeon"],
    loras:[{name:"Isometric-10", weight:1.0},{name:"Multicap-10", weight:0.7}],
    negative:"characters, faces"
  },
  {
    keywords:["city","town","street"],
    loras:[{name:"City-10", weight:1.0},{name:"Streetoto-10", weight:0.8}]
  },
  {
    keywords:["forest","wild"],
    loras:[{name:"Wild1-10", weight:1.0}]
  }
];
