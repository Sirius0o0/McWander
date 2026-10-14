const paths={
  arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',chevron:'<path d="m9 5 7 7-7 7"/>',down:'<path d="m6 9 6 6 6-6"/>',close:'<path d="m6 6 12 12M18 6 6 18"/>',
  pin:'<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  walk:'<circle cx="14" cy="4" r="2"/><path d="m8 22 3-7-2-4 3-4 4 5 4 1M4 12l4-2m3 5 5 3 1 4m-5-15-1 8"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
  compass:'<circle cx="12" cy="12" r="9"/><path d="m16 8-2.5 5.5L8 16l2.5-5.5L16 8Z"/>',
  tune:'<path d="M4 7h7m4 0h5M4 17h3m4 0h9"/><circle cx="13" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  leaf:'<path d="M20 3c-3 0-10-1-14 4S4 18 8 20s12-2 12-17Z"/><path d="M4 22 16 8m-6 6V9m0 5h5"/>',
  building:'<path d="M4 21V8l8-5 8 5v13M2 21h20M9 21v-6h6v6M8 9h1m6 0h1M8 12h1m6 0h1"/>',
  camera:'<rect x="3" y="6" width="18" height="15" rx="3"/><path d="m8 6 1-3h6l1 3"/><circle cx="12" cy="13" r="4"/>',
  book:'<path d="M12 5v16M3 3c4 0 7 0 9 2 2-2 5-2 9-2v16c-4 0-7 0-9 2-2-2-5-2-9-2V3Z"/>',
  coffee:'<path d="M4 9h13v6a6.5 6.5 0 0 1-13 0V9Zm13 1h2a3 3 0 1 1 0 6h-2M3 22h16M7 2v3m5-3v3"/>',
  spark:'<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z"/>',
  check:'<path d="m5 12 4 4L19 6"/>',info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>',
  share:'<path d="M12 16V3m-5 5 5-5 5 5M5 13H3v8h18v-8h-2"/>',plus:'<path d="M12 5v14M5 12h14"/>',minus:'<path d="M5 12h14"/>',
  locate:'<circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/>',
  wallet:'<rect x="3" y="5" width="18" height="15" rx="3"/><path d="M3 8V5l14-3v3m4 6h-6v5h6"/>',
  trash:'<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',refresh:'<path d="M20 7a9 9 0 1 0 1 8M20 3v5h-5"/>',
  download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',map:'<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Zm6-3v15m6-12v15"/>'
};
export const icon=(name,cls='')=>`<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.spark}</svg>`;
