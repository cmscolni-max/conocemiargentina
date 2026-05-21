
type GearRecommendation = { item: string; reason: string };
type SafetyAlert = { title: string; description: string; severity: string };

const hasColdWeather = (weather: string) => /fr[ií]o|cold|snow|nieve|helad/i.test(weather);
const hasWind = (weather: string) => /wind|viento|zonda/i.test(weather);
const hasRain = (weather: string) => /rain|lluv/i.test(weather);
const hasSun = (weather: string) => /sun|soleado|calor|heat/i.test(weather);

export const getGearRecommendation = async (
  location: string,
  weather: string,
  activity: string,
  language: string = 'es'
): Promise<GearRecommendation[]> => {
  const isEs = language === 'es';
  const base: GearRecommendation[] = isEs
    ? [
        { item: 'Botas de trekking', reason: 'Mejoran tracción y estabilidad en senderos irregulares.' },
        { item: 'Mochila de 20-30L', reason: 'Capacidad suficiente para agua, abrigo y botiquín.' },
        { item: 'Agua y sales', reason: 'Ayudan a prevenir deshidratación durante la actividad.' },
      ]
    : [
        { item: 'Hiking boots', reason: 'They improve traction and stability on uneven trails.' },
        { item: '20-30L backpack', reason: 'Enough room for water, layers, and first aid.' },
        { item: 'Water and electrolytes', reason: 'They help prevent dehydration during activity.' },
      ];

  if (hasColdWeather(weather)) {
    base.push(
      isEs
        ? { item: 'Campera térmica', reason: 'Mantiene temperatura corporal en condiciones frías.' }
        : { item: 'Thermal jacket', reason: 'Keeps body temperature stable in cold conditions.' }
    );
  }

  if (hasWind(weather)) {
    base.push(
      isEs
        ? { item: 'Capa corta-viento', reason: 'Reduce pérdida de calor y mejora el confort.' }
        : { item: 'Windproof shell', reason: 'Reduces heat loss and improves comfort.' }
    );
  }

  if (hasRain(weather)) {
    base.push(
      isEs
        ? { item: 'Chaqueta impermeable', reason: 'Protege de lluvia y evita enfriamiento.' }
        : { item: 'Waterproof jacket', reason: 'Protects from rain and prevents rapid cooling.' }
    );
  }

  if (hasSun(weather)) {
    base.push(
      isEs
        ? { item: 'Protector solar y gorra', reason: 'Disminuye exposición UV en altura.' }
        : { item: 'Sunscreen and cap', reason: 'Reduces UV exposure at altitude.' }
    );
  }

  if (/escalad|climb|boulder/i.test(activity)) {
    base.push(
      isEs
        ? { item: 'Casco y guantes', reason: 'Aumentan seguridad en zonas de roca.' }
        : { item: 'Helmet and gloves', reason: 'Increase safety around rocky sections.' }
    );
  }

  if (/ski/i.test(activity)) {
    base.push(
      isEs
        ? { item: 'Antiparras', reason: 'Protegen la vista en nieve y viento intenso.' }
        : { item: 'Ski goggles', reason: 'Protect vision from snow glare and strong wind.' }
    );
  }

  if (/rafting|rio|r[ií]o/i.test(activity)) {
    base.push(
      isEs
        ? { item: 'Bolsa estanca', reason: 'Mantiene secos documentos y equipo sensible.' }
        : { item: 'Dry bag', reason: 'Keeps documents and sensitive gear dry.' }
    );
  }

  const withContext = isEs
    ? { item: `Ruta en ${location}`, reason: 'Descarga mapa offline y comparte itinerario.' }
    : { item: `Route for ${location}`, reason: 'Download an offline map and share your plan.' };

  return [...base.slice(0, 6), withContext];
};

export const getSafetyAlerts = async (location: string, language: string = 'es'): Promise<SafetyAlert[]> => {
  if (language === 'es') {
    return [
      {
        title: 'Revisá pronóstico de viento',
        description: `En ${location}, ráfagas fuertes pueden cambiar rápidamente la sensación térmica y la visibilidad.`,
        severity: 'high',
      },
      {
        title: 'Planificá retorno con luz diurna',
        description: 'En zonas de montaña la temperatura cae rápido al atardecer. Evitá regresar de noche sin equipo.',
        severity: 'medium',
      },
      {
        title: 'Hidratación y ruta compartida',
        description: 'Llevá agua suficiente y avisá tu recorrido a un contacto antes de salir.',
        severity: 'low',
      },
    ];
  }

  return [
    {
      title: 'Check wind forecast',
      description: `In ${location}, strong gusts can rapidly affect temperature feel and visibility.`,
      severity: 'high',
    },
    {
      title: 'Plan daylight return',
      description: 'Mountain temperatures drop quickly after sunset. Avoid late return without proper gear.',
      severity: 'medium',
    },
    {
      title: 'Hydration and route sharing',
      description: 'Carry enough water and share your route with a trusted contact before departure.',
      severity: 'low',
    },
  ];
};
