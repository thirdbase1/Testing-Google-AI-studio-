export interface KeyFeature {
  name: string;
  description: string;
  x: number; // percentage from left
  y: number; // percentage from top
}

export interface Citation {
  title: string;
  url: string;
}

export interface LandmarkData {
  id: string;
  landmarkName: string;
  city: string;
  country: string;
  coordinates: string;
  shortDescription: string;
  detailedHistory: string;
  funFacts: string[];
  keyFeatures: KeyFeature[];
  searchQueries: string[];
  narratorScript: string;
  citations: Citation[];
  imageUrl: string;
}

export const sampleLandmarks: LandmarkData[] = [
  {
    id: "eiffel_tower",
    landmarkName: "Eiffel Tower",
    city: "Paris",
    country: "France",
    coordinates: "48.8584° N, 2.2945° E",
    imageUrl: "https://picsum.photos/seed/eiffel/800/600",
    shortDescription: "An iconic 19th-century iron lattice tower on the Champ de Mars, widely considered a masterpiece of structural engineering.",
    detailedHistory: "Designed by Gustave Eiffel for the 1889 World's Fair, which marked the centennial of the French Revolution. Initially criticized by prominent French artists and intellectuals for its industrial look, it was saved from demolition when its scientific value as a wireless telegraph transmitter was proven. Today, it stands as the ultimate symbol of Paris and France, soaring 330 meters high and attracting millions of global travelers annually.",
    funFacts: [
      "The tower can grow up to 15 cm taller during the summer due to thermal expansion of the puddle iron.",
      "It was originally intended to stand for only 20 years before being dismantled.",
      "Gustave Eiffel kept a private apartment at the very top of the tower, where he hosted notable guests like Thomas Edison."
    ],
    keyFeatures: [
      {
        name: "Summit Lantern",
        description: "Housing double searchlights that sweep the Paris sky, visible from up to 80 kilometers away.",
        x: 50,
        y: 12,
      },
      {
        name: "Second Platform",
        description: "Offers double-decker viewing areas and the Michelin-starred Jules Verne restaurant at 115 meters high.",
        x: 50,
        y: 42,
      },
      {
        name: "Iron Lattice Base",
        description: "Four massive masonry piers supporting a total weight of 10,100 tonnes with absolute structural elasticity.",
        x: 35,
        y: 85,
      }
    ],
    searchQueries: [
      "Gustave Eiffel private apartment history",
      "Eiffel Tower 1889 Worlds Fair construction",
      "Eiffel tower puddling iron engineering"
    ],
    narratorScript: "Welcome to the Champ de Mars. Before you stands the magnificent Eiffel Tower, towering three-hundred and thirty meters above Paris. Constructed for the eighteen eighty-nine World's Fair by engineer Gustave Eiffel, this wrought iron masterpiece was initially dubbed an eyesore by Parisians. Look closely at the intricate lattice design, crafted from over eighteen thousand individual metal pieces. This structural elasticity allows the tower to sway gently in high winds and even grow up to fifteen centimeters taller in summer heat. Let your eyes travel to the top, where Eiffel built a secret high-society apartment. Truly, it is an eternal fusion of art, science, and French heritage.",
    citations: [
      {
        title: "Eiffel Tower Official History",
        url: "https://www.toureiffel.paris/en/the-monument/history"
      },
      {
        title: "Gustave Eiffel's Secret Apartment - Architectural Digest",
        url: "https://www.architecturaldigest.com/story/gustave-eiffel-apartment-top-of-eiffel-tower"
      }
    ]
  },
  {
    id: "colosseum",
    landmarkName: "The Colosseum",
    city: "Rome",
    country: "Italy",
    coordinates: "41.8902° N, 12.4922° E",
    imageUrl: "https://picsum.photos/seed/colosseum/800/600",
    shortDescription: "An ancient oval amphitheater in the center of Rome, representing the pinnacle of imperial Roman engineering and architecture.",
    detailedHistory: "Commissioned around 70-72 AD by Emperor Vespasian of the Flavian dynasty as a gift to the Roman people, and completed in 80 AD under Titus. Built from travertine stone, tuff, and brick-faced concrete, it could hold up to 80,000 spectators. It hosted gladiatorial combats, wild animal hunts, drama based on classical mythology, and even simulated sea battles. Though partially ruined by earthquakes and stone-robbers, it remains a globally recognized symbol of the Roman Empire.",
    funFacts: [
      "The Colosseum had a massive retractable canvas awning called the Velarium, operated by sailors to shield spectators from the sun.",
      "The inaugural games lasted for 100 days, during which over 9,000 wild animals were killed.",
      "Below the arena floor lay the Hypogeum, a network of tunnels and trap doors with manual elevators to launch gladiators and beasts."
    ],
    keyFeatures: [
      {
        name: "Flavian Outer Arcades",
        description: "Three tiers of 80 arches each, showcasing Doric, Ionic, and Corinthian columns in ascending order.",
        x: 65,
        y: 35,
      },
      {
        name: "The Hypogeum Tunnels",
        description: "The subterranean labyrinth of cages, elevators, and tunnels once hidden beneath a wooden arena floor.",
        x: 50,
        y: 75,
      },
      {
        name: "Imperial Entrance Arch",
        description: "The grand northern arch reserved exclusively for the Roman Emperor and his elite senatorial entourage.",
        x: 20,
        y: 55,
      }
    ],
    searchQueries: [
      "Colosseum hypogeum lift mechanisms",
      "Roman Velarium awning operations",
      "Flavian Amphitheatre construction materials"
    ],
    narratorScript: "Step back in time to the Roman Empire. You are standing before the Colosseum, or Flavian Amphitheatre, completed in eighty AD. Imagine eighty thousand cheering citizens packing these stone tiers. Look down at the exposed subterranean tunnels, known as the Hypogeum. In antiquity, this labyrinth was covered with a wooden floor where gladiators and exotic beasts were hoisted via manual pulley elevators to surprise the crowd. Look at the outer arches, which exhibit three distinct architectural orders as you look up: Tuscan at the bottom, Ionic in the middle, and Corinthian at the top. This structure remains a timeless testament to imperial engineering.",
    citations: [
      {
        title: "Colosseum Subterranean Labyrinth - History Channel",
        url: "https://www.history.com/news/colosseum-underground-tunnels-hypogeum"
      },
      {
        title: "Flavian Amphitheater Architecture - Rome Guide",
        url: "https://colosseumroma-tickets.com/colosseum-architecture/"
      }
    ]
  },
  {
    id: "taj_mahal",
    landmarkName: "Taj Mahal",
    city: "Agra",
    country: "India",
    coordinates: "27.1751° N, 78.0421° E",
    imageUrl: "https://picsum.photos/seed/tajmahal/800/600",
    shortDescription: "An ivory-white marble mausoleum on the south bank of the Yamuna River, symbolizing eternal romantic devotion.",
    detailedHistory: "Commissioned in 1632 by the Mughal emperor Shah Jahan to house the tomb of his favorite wife, Mumtaz Mahal. Constructed over a 20-year period by more than 20,000 artisans under the direction of court architect Ustad Ahmad Lahori. The Taj Mahal is celebrated worldwide as the jewel of Mughal art, seamlessly blending Islamic, Persian, Ottoman Turkish, and Indian architectural styles.",
    funFacts: [
      "The white marble walls are inlaid with 28 types of precious and semi-precious stones imported from Tibet, China, and Sri Lanka.",
      "The four surrounding minarets are tilted slightly outwards so that in the event of an earthquake, they would fall away from the main dome.",
      "The marble surfaces change color depending on the time of day, glowing pinkish-orange in the morning, milky white in the afternoon, and golden-blue under the moonlight."
    ],
    keyFeatures: [
      {
        name: "Onion Dome",
        description: "The majestic central marble dome, rising nearly 35 meters and topped with a gilded finial combining crescent and lotus.",
        x: 50,
        y: 28,
      },
      {
        name: "Outward Minarets",
        description: "Four elegant 40-meter towers built at the corners of the plinth, designed with a deliberate outward-tilting angle.",
        x: 18,
        y: 50,
      },
      {
        name: "Grand Pishtaq Arch",
        description: "The monumental vaulted gateway featuring Quranic calligraphy inlaid in black marble onto the white stone.",
        x: 50,
        y: 60,
      }
    ],
    searchQueries: [
      "Taj Mahal semi precious stone inlay",
      "Ustad Ahmad Lahori architectural design Taj Mahal",
      "Taj Mahal minaret earthquake prevention design"
    ],
    narratorScript: "Welcome to Agra, along the banks of the Yamuna River. Gaze upon the Taj Mahal, an ivory-white marble mausoleum commissioned in sixteen thirty-two by Emperor Shah Jahan for his beloved wife Mumtaz Mahal. Observe the perfect, flawless symmetry of the structure. Notice the central onion dome, towering thirty-five meters high. The four surrounding minarets are cleverly tilted slightly outward. This protects the tomb in an earthquake. Take a closer look at the marble facade. It is inlaid with semi-precious stones that capture the shifting light, glowing pink at sunrise, pure white at noon, and golden in moonlight. It is a monument of pure devotion.",
    citations: [
      {
        title: "Taj Mahal Architecture and Inlay - UNESCO World Heritage",
        url: "https://whc.unesco.org/en/list/252/"
      },
      {
        title: "The Engineering Genius of the Taj Mahal - BBC",
        url: "https://www.bbc.com/travel/article/20210815-the-taj-mahal-an-eternal-symbol-of-engineering-genius"
      }
    ]
  }
];
