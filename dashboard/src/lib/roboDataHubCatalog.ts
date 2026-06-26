export type CatalogRouteKey = "carAutomation" | "serverrack" | "dexterity" | "warehouse";

export interface CatalogImageSet {
  main: string;
  thumbs: string[];
}

export interface CatalogCard {
  title: string;
  description: string;
  tags: string[];
  availability: "In Library" | "On-demand";
  hours: string;
  pathLabel: string;
  images: CatalogImageSet;
  livePathHints?: string[];
  previewVideoBlobPath?: string;
}

export interface CatalogSection {
  id: string;
  title: string;
  countLabel: string;
  cards: CatalogCard[];
}

export interface RootShowcaseSection {
  routeKey: CatalogRouteKey;
  title: string;
  lineClassName: string;
  dotClassName: string;
  cards: CatalogCard[];
}

export interface CategoryLandingContent {
  routeKey: CatalogRouteKey;
  breadcrumbLabel: string;
  heroEyebrow: string;
  heroTitle: string;
  heroDescription: string;
  heroImagePath: string;
  heroVideoBlobPath?: string;
  heroBadge: string;
  heroPill: string;
  stats: { value: string; label: string }[];
  filters: { id: string; label: string; dotClassName: string }[];
  sections: CatalogSection[];
  ctaTitle: string;
  ctaDescription: string;
}

function imageSet(main: string, ...thumbs: string[]): CatalogImageSet {
  return { main, thumbs };
}

export const ROOT_SHOWCASE_SECTIONS: RootShowcaseSection[] = [
  {
    routeKey: "serverrack",
    title: "Data Center",
    lineClassName: "from-blue-200",
    dotClassName: "bg-blue-600",
    cards: [
      {
        title: "Rack Cabling & Patch Panel",
        description:
          "Full patch panel workflow - cable insertion, loop management, labeling on live data center floor.",
        tags: ["EXO-Centric", "Task Labels", "Bbox"],
        availability: "In Library",
        hours: "1,200 hrs",
        pathLabel: "serverrack/cabling/rackPatch",
        images: imageSet("serverrack/cablemanagement_1.png", "serverrack/cablemanagement_3.png", "serverrack/cablemanagement_2.png", "serverrack/cablemanagement_4.png"),
        livePathHints: ["ethernetCable"],
      },
      {
        title: "Loop Cable Installation",
        description:
          "Hands-on cable loop management - routing, fastening, and dress-out in live server room environment.",
        tags: ["EXO-Centric", "Task Labels"],
        availability: "In Library",
        hours: "600 hrs",
        pathLabel: "serverrack/cabling/loopCable",
        images: imageSet("serverrack/cablemanagement_4.png", "serverrack/cablemanagement_1.png", "serverrack/cablemanagement_2.png", "serverrack/cablemanagement_3.png"),
        livePathHints: ["AD-Plugging-Cable"],
      },
      {
        title: "Server Rack Inspection",
        description:
          "EGO-centric inspection - slot identification, LED status reading, and hardware swap sequences.",
        tags: ["EGO-Centric", "Task Labels", "Bbox"],
        availability: "In Library",
        hours: "840 hrs",
        pathLabel: "serverrack/server/rackInspect",
        images: imageSet("serverrack/serverrack2.png", "serverrack/serverrack1.png", "serverrack/serverrack4.png", "serverrack/serverrack3.png"),
        livePathHints: ["datacenterRack"],
      },
      {
        title: "Hardware Swap & Replacement",
        description:
          "Blade, drive, and module replacement workflows captured from real server maintenance operations.",
        tags: ["EXO-Centric", "Task Labels", "Seg"],
        availability: "In Library",
        hours: "720 hrs",
        pathLabel: "serverrack/hardware/hwSwap",
        images: imageSet("serverrack/serverrack3.png", "serverrack/serverrack1.png", "serverrack/serverrack2.png", "serverrack/serverrack4.png"),
        livePathHints: ["switchTray"],
      },
    ],
  },
  {
    routeKey: "warehouse",
    title: "Warehouse",
    lineClassName: "from-orange-200",
    dotClassName: "bg-orange-500",
    cards: [
      {
        title: "Pick & Place - Shelf Interaction",
        description:
          "Shelf reach, grasp, transfer, and place phases from a live warehouse workflow.",
        tags: ["EGO-Centric", "Task Labels", "Edge Cases"],
        availability: "In Library",
        hours: "1,200 hrs",
        pathLabel: "warehouse/pick/shelfInteract",
        images: imageSet("warehouse/warehouse2.png", "warehouse/warehouse4.png", "warehouse/warehouse3.png", "warehouse/warehouse1.png"),
        livePathHints: ["AVnavigation"],
      },
      {
        title: "Pallet Stacking & Transport",
        description:
          "Layered stacking motions that benefit from ordered stage boundaries and repeatable task structure.",
        tags: ["EXO-Centric", "Task Labels", "Bbox"],
        availability: "In Library",
        hours: "980 hrs",
        pathLabel: "warehouse/material/palletStack",
        images: imageSet("warehouse/warehouse1.png", "warehouse/warehouse2.png", "warehouse/warehouse3.png", "warehouse/warehouse4.png"),
        livePathHints: ["steelPallets"],
      },
      {
        title: "Inventory Scanning & Audit",
        description:
          "Cycle counting, shelf verification, and scan-guided audit routines for robot-assisted inventory workflows.",
        tags: ["EGO-Centric", "Task Labels", "Edge Cases"],
        availability: "On-demand",
        hours: "650 hrs",
        pathLabel: "warehouse/inventory/scanning",
        images: imageSet("warehouse/warehouse3.png", "warehouse/warehouse2.png", "warehouse/warehouse1.png", "warehouse/warehouse4.png"),
      },
      {
        title: "QC Defect Inspection",
        description:
          "Outbound inspection and anomaly review captured around high-throughput warehouse handling lines.",
        tags: ["EGO-Centric", "Defect Labels"],
        availability: "On-demand",
        hours: "420 hrs",
        pathLabel: "warehouse/inventory/qcInspect",
        images: imageSet("warehouse/warehouse4.png", "warehouse/warehouse1.png", "warehouse/warehouse3.png", "warehouse/warehouse2.png"),
      },
    ],
  },
  {
    routeKey: "dexterity",
    title: "Dexterity",
    lineClassName: "from-teal-200",
    dotClassName: "bg-teal-600",
    cards: [
      {
        title: "Dishwashing - Hand Manipulation",
        description:
          "Fine-grained hand and object manipulation in wet, soapy conditions. Ideal for dexterous robot training.",
        tags: ["EXO-Centric", "Hand Pose", "Wet Conditions"],
        availability: "In Library",
        hours: "600 hrs",
        pathLabel: "dexterity/kitchen/dishwashing",
        images: imageSet("humanoid/humanoid3.png", "humanoid/humanoid5.png", "humanoid/humanoid4.png", "humanoid/humanoid1.png"),
        livePathHints: ["dishWasherUnloading"],
      },
      {
        title: "Surface Cleaning & Wiping",
        description:
          "Dexterous arm trajectories for table, counter, and floor cleaning with repeatable wipe patterns.",
        tags: ["EXO-Centric", "Hand Pose", "Task Labels"],
        availability: "In Library",
        hours: "450 hrs",
        pathLabel: "dexterity/cleaning/surfaceWipe",
        images: imageSet("humanoid/humanoid1.png", "humanoid/humanoid3.png", "humanoid/humanoid4.png", "humanoid/humanoid5.png"),
        livePathHints: ["wiping-counter"],
      },
      {
        title: "Trash Collection & Sorting",
        description:
          "Grasp-and-bin sequences for mixed waste streams, lid manipulation, and bagging edge cases.",
        tags: ["EGO-Centric", "Hand Pose", "Edge Cases"],
        availability: "On-demand",
        hours: "380 hrs",
        pathLabel: "dexterity/household/trashSort",
        images: imageSet("humanoid/trash_1.png", "humanoid/trash_2.png", "humanoid/trash_3.png", "humanoid/trash_4.png"),
      },
      {
        title: "Laundry - Load & Fold",
        description:
          "Cloth manipulation - sorting, loading washer/dryer, and folding garments across deformable-object states.",
        tags: ["EXO-Centric", "Hand Pose", "Seg"],
        availability: "In Library",
        hours: "520 hrs",
        pathLabel: "dexterity/household/laundry",
        images: imageSet("humanoid/humanoid5.png", "humanoid/humanoid1.png", "humanoid/humanoid3.png", "humanoid/humanoid4.png"),
        livePathHints: ["towel"],
      },
    ],
  },
  {
    routeKey: "carAutomation",
    title: "Automotive",
    lineClassName: "from-violet-200",
    dotClassName: "bg-violet-600",
    cards: [
      {
        title: "BMW Front Grille Assembly",
        description:
          "Production-line assembly from BMW facility. Multi-step grille fitting, fastening and QC inspection.",
        tags: ["EXO-Centric", "Task Labels", "Seg"],
        availability: "In Library",
        hours: "2,100 hrs",
        pathLabel: "carAutomation/BMW/frontGrille",
        images: imageSet("carAutomation/carAutomation2.png", "carAutomation/carAutomation5.png", "carAutomation/carAutomation3.png", "carAutomation/carAutomation4.png"),
        livePathHints: ["frontGrille"],
      },
      {
        title: "Front Seat Installation",
        description:
          "Seat alignment, bolt-down, and connector-clip sequences across multiple vehicle platforms.",
        tags: ["EXO-Centric", "Task Labels", "Bbox"],
        availability: "In Library",
        hours: "1,400 hrs",
        pathLabel: "carAutomation/Porsche/frontSeat",
        images: imageSet("carAutomation/carAutomation3.png", "carAutomation/carAutomation4.png", "carAutomation/carAutomation2.png", "carAutomation/carAutomation5.png"),
        livePathHints: ["frontSeat"],
      },
      {
        title: "Passenger Seat QC Inspection",
        description:
          "EGO-centric quality inspection of seat fitment, trim alignment, and seatbelt anchor verification.",
        tags: ["EGO-Centric", "Task Labels", "Seg"],
        availability: "In Library",
        hours: "900 hrs",
        pathLabel: "carAutomation/hyundai/passengerSeat",
        images: imageSet("carAutomation/carAutomation4.png", "carAutomation/carAutomation3.png", "carAutomation/carAutomation5.png", "carAutomation/carAutomation2.png"),
        livePathHints: ["passengerSeat"],
      },
      {
        title: "Rear Bumper Assembly",
        description:
          "Bumper alignment, clip insertion, and sensor harness routing across multiple trim levels.",
        tags: ["EXO-Centric", "Task Labels", "Edge Cases"],
        availability: "In Library",
        hours: "1,100 hrs",
        pathLabel: "carAutomation/bmw/rearBumper",
        images: imageSet("carAutomation/carAutomation5.png", "carAutomation/carAutomation2.png", "carAutomation/carAutomation4.png", "carAutomation/carAutomation3.png"),
        livePathHints: ["rearBumper"],
      },
    ],
  },
];

export const CATEGORY_LANDING_CONTENT: Record<CatalogRouteKey, CategoryLandingContent> = {
  serverrack: {
    routeKey: "serverrack",
    breadcrumbLabel: "SERVERRACK",
    heroEyebrow: "Data Center · Robotics AI",
    heroTitle: "RoboDataHub Data Center",
    heroDescription:
      "High-fidelity, fully-labelled data center operations datasets captured from live server room environments - built for robotics automation training pipelines.",
    heroImagePath: "serverrack/serverrack1.png",
    heroVideoBlobPath: "serverrack/Dell/dataRackInstall/preview/hover.mp4",
    heroBadge: "Featured · Robotics AI",
    heroPill: "9 datasets available",
    stats: [
      { value: "5,500+", label: "Total Hours" },
      { value: "3 Envs", label: "Environments" },
      { value: "9 ds", label: "Total Datasets" },
      { value: "98.1%", label: "Label Accuracy" },
      { value: "8 types", label: "Operation Classes" },
    ],
    filters: [
      { id: "all", label: "All Tasks", dotClassName: "bg-blue-600" },
      { id: "featured", label: "Rack Hardware & Cabling", dotClassName: "bg-blue-600" },
      { id: "cable", label: "Cable Management", dotClassName: "bg-blue-400" },
      { id: "server", label: "Server Operations", dotClassName: "bg-blue-500" },
      { id: "hardware", label: "Hardware Maintenance", dotClassName: "bg-blue-700" },
    ],
    sections: [
      {
        id: "featured",
        title: "Rack Hardware & Cabling",
        countLabel: "4 datasets",
        cards: [
          {
            title: "Data Rack Install",
            description: "Rack installation workflow with source footage, occlusion removal, generated viewpoints, and downloadable tag/intelligence files.",
            tags: ["EXO-Centric", "Task Labels", "Generated Views"],
            availability: "In Library",
            hours: "Live dataset",
            pathLabel: "serverrack/dataRackInstall",
            images: imageSet("serverrack/serverrack1.png", "serverrack/serverrack2.png", "serverrack/serverrack3.png", "serverrack/serverrack4.png"),
            livePathHints: ["serverrack/dataRackInstall"],
            previewVideoBlobPath: "serverrack/dataRackInstall/showcase/original.mp4",
          },
          {
            title: "Rack PDU Installation",
            description: "Rack-side PDU installation with occlusion removal, generated camera angles, and rich downloadable generation outputs.",
            tags: ["EXO-Centric", "Task Labels", "Rack Power"],
            availability: "In Library",
            hours: "Live dataset",
            pathLabel: "serverrack/pduInstallation",
            images: imageSet("serverrack/serverrack4.png", "serverrack/serverrack3.png", "serverrack/serverrack2.png", "serverrack/serverrack1.png"),
            livePathHints: ["serverrack/pduInstallation"],
            previewVideoBlobPath: "serverrack/pduInstallation/showcase/original.mp4",
          },
          {
            title: "AD Plugging Cable",
            description: "Cable-plugging workflow with generated viewpoints, task intelligence, tag JSON, and preview-ready source footage.",
            tags: ["EXO-Centric", "Task Labels", "Generated Views"],
            availability: "In Library",
            hours: "Live dataset",
            pathLabel: "serverrack/AD-Plugging-Cable",
            images: imageSet(
              "serverrack/cablemanagement_4.png",
              "serverrack/cablemanagement_2.png",
              "serverrack/cablemanagement_1.png",
              "serverrack/cablemanagement_3.png",
            ),
            livePathHints: ["serverrack/AD-Plugging-Cable"],
            previewVideoBlobPath: "serverrack/AD-Plugging-Cable/showcase/original.mp4",
          },
          {
            title: "Cable Insertion",
            description:
              "Ethernet cable insertion workflow with generated viewpoints, tag JSON, task intelligence, and short preview clips.",
            tags: ["EXO-Centric", "Task Labels", "Cable Routing"],
            availability: "In Library",
            hours: "Live dataset",
            pathLabel: "serverrack/cableInsertion",
            images: imageSet(
              "serverrack/cablemanagement_1.png",
              "serverrack/cablemanagement_2.png",
              "serverrack/cablemanagement_3.png",
              "serverrack/cablemanagement_4.png",
            ),
            livePathHints: ["serverrack/cableInsertion"],
            previewVideoBlobPath: "serverrack/cableInsertion/showcase/original.mp4",
          },
        ],
      },
      {
        id: "cable",
        title: "Cable Management",
        countLabel: "5 datasets",
        cards: [
          {
            ...ROOT_SHOWCASE_SECTIONS[0].cards[0],
            availability: "On-demand",
            livePathHints: undefined,
          },
          {
            title: "Ethernet Cable",
            description:
              "Live rack-side ethernet cable handling with connector alignment, insertion, and route management in dense server environments.",
            tags: ["EXO-Centric", "Task Labels", "Bbox"],
            availability: "In Library",
            hours: "420 hrs",
            pathLabel: "serverrack/cabling/ethernetCable",
            images: imageSet(
              "serverrack/cablemanagement_2.png",
              "serverrack/cablemanagement_1.png",
              "serverrack/cablemanagement_3.png",
              "serverrack/cablemanagement_4.png",
            ),
            livePathHints: ["ethernetCable"],
          },
          {
            ...ROOT_SHOWCASE_SECTIONS[0].cards[1],
            availability: "On-demand",
            livePathHints: undefined,
          },
          ROOT_SHOWCASE_SECTIONS[0].cards[2],
          {
            title: "Cable Bundle Tie-Down",
            description: "Final tie-down, strain relief, and cable-dress routines around bundled runs and patch-panel exits.",
            tags: ["EXO-Centric", "Task Labels"],
            availability: "On-demand",
            hours: "480 hrs",
            pathLabel: "serverrack/cabling/bundleTieDown",
            images: imageSet("serverrack/cablemanagement_1.png", "serverrack/cablemanagement_4.png", "serverrack/cablemanagement_2.png", "serverrack/cablemanagement_3.png"),
          },
        ],
      },
      {
        id: "server",
        title: "Server Operations",
        countLabel: "3 datasets",
        cards: [
          ROOT_SHOWCASE_SECTIONS[0].cards[2],
          {
            title: "Dell R730xd Chassis Inspection",
            description: "Chassis-level inspection passes around drive bays, rear-drive options, and service-access points on a Dell PowerEdge R730xd.",
            tags: ["EXO-Centric", "Task Labels", "Hardware Review"],
            availability: "In Library",
            hours: "520 hrs",
            pathLabel: "serverrack/server/hotSwap",
            images: imageSet("serverrack/serverrack3.png", "serverrack/serverrack4.png", "serverrack/serverrack1.png", "serverrack/serverrack2.png"),
            livePathHints: ["R730xd"],
          },
          {
            title: "Hot-Swap Drive Replacement",
            description: "Drive removal and reseat workflow captured from an IBM x3690 X5 hot-swap maintenance task with tool-less rack access.",
            tags: ["EXO-Centric", "Task Labels", "Maintenance"],
            availability: "In Library",
            hours: "390 hrs",
            pathLabel: "serverrack/server/pduCheck",
            images: imageSet("serverrack/serverrack1.png", "serverrack/serverrack2.png", "serverrack/serverrack3.png", "serverrack/serverrack4.png"),
            livePathHints: ["x3690X5hotSwap"],
          },
          {
            title: "Server LED Status Review",
            description: "Rack-front LED and slot-status review workflow focused on health checks, fault lights, and service confirmation passes.",
            tags: ["EGO-Centric", "Task Labels"],
            availability: "On-demand",
            hours: "330 hrs",
            pathLabel: "serverrack/server/ledStatus",
            images: imageSet("serverrack/ledreview_1.png", "serverrack/ledreview_2.png", "serverrack/ledreview_3.png", "serverrack/ledreview_4.png"),
          },
        ],
      },
      {
        id: "hardware",
        title: "Hardware Maintenance",
        countLabel: "2 datasets",
        cards: [
          ROOT_SHOWCASE_SECTIONS[0].cards[3],
          {
            title: "Network Card Installation",
            description: "Server-side NIC installation and seating workflow on an HPE ProLiant platform, including slot access and final verification.",
            tags: ["EXO-Centric", "Task Labels"],
            availability: "In Library",
            hours: "310 hrs",
            pathLabel: "serverrack/hardware/netCard",
            images: imageSet("serverrack/serverrack2.png", "serverrack/serverrack2.png", "serverrack/serverrack1.png", "serverrack/serverrack3.png"),
            livePathHints: ["networkcardInstall"],
          },
        ],
      },
    ],
    ctaTitle: "Ready to train smarter robots?",
    ctaDescription:
      "Structured, fully-labelled data center datasets captured from live server room environments - plug directly into your robotics training pipeline today.",
  },
  dexterity: {
    routeKey: "dexterity",
    breadcrumbLabel: "DEXTERITY",
    heroEyebrow: "Dexterity · Robotics AI",
    heroTitle: "RoboDataHub Dexterity",
    heroDescription:
      "High-fidelity, fully-labelled dexterity task datasets captured across real-world domestic and commercial environments - built for dexterous robot training pipelines.",
    heroImagePath: "humanoid/humanoid3.png",
    heroVideoBlobPath: "humanoid/Awign/peelingPeas/preview/hover.mp4",
    heroBadge: "Featured · Robotics AI",
    heroPill: "9 datasets available",
    stats: [
      { value: "3,800+", label: "Total Hours" },
      { value: "3 Envs", label: "Environments" },
      { value: "9 ds", label: "Total Datasets" },
      { value: "97.4%", label: "Label Accuracy" },
      { value: "7 types", label: "Operation Classes" },
    ],
    filters: [
      { id: "all", label: "All Tasks", dotClassName: "bg-teal-600" },
      { id: "featured", label: "Object Handling", dotClassName: "bg-teal-600" },
      { id: "kitchen", label: "Kitchen Tasks", dotClassName: "bg-teal-400" },
      { id: "cleaning", label: "Cleaning & Hygiene", dotClassName: "bg-teal-500" },
      { id: "household", label: "Household Operations", dotClassName: "bg-teal-700" },
    ],
    sections: [
      {
        id: "featured",
        title: "Dexterous Object Handling",
        countLabel: "3 datasets",
        cards: [
          {
            title: "Plastic Packing",
            description: "Dexterous packing workflow with source footage, hand-motion src-cam output, tag JSON, and preview-ready generation assets.",
            tags: ["EXO-Centric", "Hand Pose", "Motion Output"],
            availability: "In Library",
            hours: "Live dataset",
            pathLabel: "dexterity/plasticPacking",
            images: imageSet("humanoid/humanoid1.png", "humanoid/humanoid4.png", "humanoid/humanoid3.png", "humanoid/humanoid5.png"),
            livePathHints: ["dexterity/plasticPacking"],
            previewVideoBlobPath: "dexterity/plasticPacking/showcase/original.mp4",
          },
          {
            title: "Making Sandwich",
            description: "Kitchen dexterity task with source footage, hand-motion src-cam output, tag JSON, and task-level downloadable assets.",
            tags: ["EXO-Centric", "Hand Pose", "Motion Output"],
            availability: "In Library",
            hours: "Live dataset",
            pathLabel: "dexterity/cheeseSandwich",
            images: imageSet("humanoid/foodprep_1.png", "humanoid/foodprep_2.png", "humanoid/foodprep_3.png", "humanoid/foodprep_4.png"),
            livePathHints: ["dexterity/cheeseSandwich"],
            previewVideoBlobPath: "dexterity/cheeseSandwich/showcase/original.mp4",
          },
          {
            title: "Towel Folding",
            description: "Soft-goods manipulation dataset with source footage, hand-motion src-cam output, MoCap visualisation, and downloadable generation files.",
            tags: ["EXO-Centric", "Hand Pose", "MoCap"],
            availability: "In Library",
            hours: "Live dataset",
            pathLabel: "dexterity/towel",
            images: imageSet("humanoid/humanoid5.png", "humanoid/humanoid1.png", "humanoid/humanoid3.png", "humanoid/humanoid4.png"),
            livePathHints: ["dexterity/towel"],
            previewVideoBlobPath: "dexterity/towel/showcase/original.mp4",
          },
        ],
      },
      {
        id: "kitchen",
        title: "Kitchen Tasks",
        countLabel: "4 datasets",
        cards: [
          ROOT_SHOWCASE_SECTIONS[2].cards[0],
          {
            title: "Food Prep & Plating",
            description: "Ingredient handling, plating, and tool-use sequences around fine kitchen manipulation.",
            tags: ["EXO-Centric", "Hand Pose", "Task Labels"],
            availability: "On-demand",
            hours: "540 hrs",
            pathLabel: "dexterity/kitchen/foodPrep",
            images: imageSet("humanoid/foodprep_1.png", "humanoid/foodprep_2.png", "humanoid/foodprep_3.png", "humanoid/foodprep_4.png"),
            livePathHints: undefined,
          },
          {
            title: "Peeling Peas",
            description: "Fine-grained ingredient prep focused on repeated pea-shell handling, separation, and small-object hand manipulation.",
            tags: ["EXO-Centric", "Hand Pose", "Task Labels"],
            availability: "In Library",
            hours: "540 hrs",
            pathLabel: "dexterity/kitchen/peelingPeas",
            images: imageSet("humanoid/foodprep_2.png", "humanoid/foodprep_1.png", "humanoid/foodprep_3.png", "humanoid/foodprep_4.png"),
            livePathHints: ["peelingPeas"],
          },
          {
            title: "Appliance Operation",
            description: "Knob, handle, and door operations where state transitions matter as much as contact points.",
            tags: ["EXO-Centric", "Hand Pose"],
            availability: "On-demand",
            hours: "490 hrs",
            pathLabel: "dexterity/kitchen/appliance",
            images: imageSet("humanoid/Appliance_1.png", "humanoid/Appliance_2.png", "humanoid/Appliance_3.png", "humanoid/Appliance_4.png"),
            livePathHints: undefined,
          },
        ],
      },
      {
        id: "cleaning",
        title: "Cleaning & Hygiene",
        countLabel: "4 datasets",
        cards: [
          {
            title: "Counter Wiping",
            description: "Counter-surface wiping sequences with short reach cycles, repeated passes, and coverage around sink-side clutter.",
            tags: ["EXO-Centric", "Hand Pose", "Task Labels"],
            availability: "In Library",
            hours: "450 hrs",
            pathLabel: "dexterity/cleaning/surfaceWipe",
            images: imageSet("humanoid/humanoid1.png", "humanoid/humanoid3.png", "humanoid/humanoid4.png", "humanoid/humanoid5.png"),
            livePathHints: ["wiping-counter"],
          },
          {
            title: "Floor Mopping",
            description: "Long-stroke mopping motions with floor coverage, turn-around handling, and repeatable edge-to-edge cleaning passes.",
            tags: ["EXO-Centric", "Hand Pose", "Task Labels"],
            availability: "In Library",
            hours: "410 hrs",
            pathLabel: "dexterity/cleaning/floorMop",
            images: imageSet("humanoid/humanoid4.png", "humanoid/humanoid1.png", "humanoid/humanoid5.png", "humanoid/humanoid3.png"),
            livePathHints: ["mopping"],
          },
          {
            title: "Washing Machine",
            description: "Real-world washing-machine interaction with door handling, load placement, and state-aware task progression.",
            tags: ["EXO-Centric", "Hand Pose"],
            availability: "In Library",
            hours: "490 hrs",
            pathLabel: "dexterity/cleaning/washingMachine",
            images: imageSet("humanoid/Appliance_2.png", "humanoid/Appliance_1.png", "humanoid/Appliance_3.png", "humanoid/Appliance_4.png"),
            livePathHints: ["washingMachine"],
          },
          {
            title: "Bathroom Sanitization",
            description: "High-frequency sanitation tasks across constrained domestic surfaces and fixtures.",
            tags: ["EXO-Centric", "Task Labels"],
            availability: "On-demand",
            hours: "360 hrs",
            pathLabel: "dexterity/cleaning/bathroom",
            images: imageSet("humanoid/bathroomsani_1.png", "humanoid/bathroomsani_2.png", "humanoid/bathroomsani_3.png", "humanoid/bathroomsani_4.png"),
          },
        ],
      },
      {
        id: "household",
        title: "Household Operations",
        countLabel: "3 datasets",
        cards: [
          {
            title: "Crockery Cabinet Organization",
            description: "Dish and crockery arrangement task with shelf placement, object rotation, and cabinet-space organization.",
            tags: ["EXO-Centric", "Task Labels", "Object Placement"],
            availability: "In Library",
            hours: "340 hrs",
            pathLabel: "dexterity/household/objOrg",
            images: imageSet("humanoid/humanoid1.png", "humanoid/humanoid4.png", "humanoid/humanoid3.png", "humanoid/humanoid5.png"),
            livePathHints: ["crockery"],
          },
          {
            title: "Trash Collection & Sorting",
            description: "Grasp-and-bin sequences for mixed waste streams, lid manipulation, and bagging edge cases.",
            tags: ["EGO-Centric", "Hand Pose", "Edge Cases"],
            availability: "On-demand",
            hours: "380 hrs",
            pathLabel: "dexterity/household/trashSort",
            images: imageSet("humanoid/trash_1.png", "humanoid/trash_2.png", "humanoid/trash_3.png", "humanoid/trash_4.png"),
          },
          {
            title: "Shelf Restocking",
            description: "Reach, place, and align motions for returning common household items to shelves, bins, and cabinets.",
            tags: ["EXO-Centric", "Task Labels", "Object Placement"],
            availability: "On-demand",
            hours: "350 hrs",
            pathLabel: "dexterity/household/restocking",
            images: imageSet("humanoid/shelf_2.png", "humanoid/shelf_3.png", "humanoid/shelf_4.png", "humanoid/shelf_2.png"),
          },
        ],
      },
    ],
    ctaTitle: "Ready to train smarter robots?",
    ctaDescription:
      "Structured, fully-labelled dexterity task datasets captured from real-world domestic and commercial environments - plug directly into your dexterous robot training pipeline today.",
  },
  warehouse: {
    routeKey: "warehouse",
    breadcrumbLabel: "WAREHOUSE",
    heroEyebrow: "Warehouse · Robotics AI",
    heroTitle: "RoboDataHub Warehouse",
    heroDescription:
      "High-fidelity, fully-labelled warehouse operations datasets captured from live fulfilment environments - built for robotics automation training pipelines.",
    heroImagePath: "warehouse/warehouse2.png",
    heroVideoBlobPath: "warehouse/Symbotic/AVnavigation/preview/hover.mp4",
    heroBadge: "Featured · Robotics AI",
    heroPill: "9 datasets available",
    stats: [
      { value: "6,330+", label: "Total Hours" },
      { value: "3 Envs", label: "Environments" },
      { value: "9 ds", label: "Total Datasets" },
      { value: "97.8%", label: "Label Accuracy" },
      { value: "6 types", label: "Operation Classes" },
    ],
    filters: [
      { id: "all", label: "All Tasks", dotClassName: "bg-orange-500" },
      { id: "pick", label: "Pick & Place", dotClassName: "bg-orange-300" },
      { id: "material", label: "Material Handling", dotClassName: "bg-orange-400" },
      { id: "inventory", label: "Inventory & QC", dotClassName: "bg-orange-600" },
    ],
    sections: [
      {
        id: "pick",
        title: "Pick & Place",
        countLabel: "4 datasets",
        cards: [
          ROOT_SHOWCASE_SECTIONS[1].cards[0],
          {
            title: "Bin Picking",
            description: "High-speed bin picking from dense part piles with irregular geometry, clutter, and repeated target re-grasps.",
            tags: ["EXO-Centric", "Task Labels", "Bbox"],
            availability: "In Library",
            hours: "760 hrs",
            pathLabel: "warehouse/pick/binPicking",
            images: imageSet("warehouse/warehouse1.png", "warehouse/warehouse2.png", "warehouse/warehouse3.png", "warehouse/warehouse4.png"),
            livePathHints: ["bin-picking"],
          },
          {
            title: "Order Picking",
            description: "Pick-route task focused on selecting individual order items from storage positions and completing pick confirmations.",
            tags: ["EXO-Centric", "Task Labels", "Pick Route"],
            availability: "In Library",
            hours: "540 hrs",
            pathLabel: "warehouse/pick/skuGrasp",
            images: imageSet("warehouse/warehouse3.png", "warehouse/warehouse2.png", "warehouse/warehouse1.png", "warehouse/warehouse4.png"),
            livePathHints: ["orderPicking"],
          },
          {
            title: "Shelf Replenishment Pick",
            description: "Pick-and-place replenishment cycles moving inbound inventory from totes onto forward pick shelves.",
            tags: ["EXO-Centric", "Task Labels"],
            availability: "On-demand",
            hours: "460 hrs",
            pathLabel: "warehouse/pick/replenishment",
            images: imageSet("warehouse/warehouse2.png", "warehouse/warehouse1.png", "warehouse/warehouse4.png", "warehouse/warehouse3.png"),
          },
        ],
      },
      {
        id: "material",
        title: "Material Handling",
        countLabel: "4 datasets",
        cards: [
          {
            title: "Steel Pallet Stacking",
            description: "Stacking and placement workflow for steel pallets with careful edge alignment and repeated heavy-object set-down.",
            tags: ["EXO-Centric", "Task Labels", "Heavy Load"],
            availability: "In Library",
            hours: "980 hrs",
            pathLabel: "warehouse/material/palletStack",
            images: imageSet("warehouse/warehouse1.png", "warehouse/warehouse2.png", "warehouse/warehouse3.png", "warehouse/warehouse4.png"),
            livePathHints: ["steelPallets"],
          },
          {
            title: "Pallet Loading to Trailer",
            description: "Trailer-loading workflow for moving pallet loads safely onto a truck tray with controlled placement and handoff.",
            tags: ["EXO-Centric", "Task Labels", "Trailer Loading"],
            availability: "In Library",
            hours: "780 hrs",
            pathLabel: "warehouse/material/conveyor",
            images: imageSet("warehouse/warehouse4.png", "warehouse/warehouse1.png", "warehouse/warehouse2.png", "warehouse/warehouse3.png"),
            livePathHints: ["loadingPellets"],
          },
          {
            title: "Cross-Dock Transfer",
            description: "Transfer routines spanning inbound, outbound, and temporary staging areas.",
            tags: ["EXO-Centric", "Task Labels"],
            availability: "On-demand",
            hours: "620 hrs",
            pathLabel: "warehouse/material/crossDock",
            images: imageSet("warehouse/warehouse2.png", "warehouse/warehouse3.png", "warehouse/warehouse4.png", "warehouse/warehouse1.png"),
          },
          {
            title: "Pallet Jack Positioning",
            description: "Approach, align, and reposition pallet loads within narrow warehouse aisles and staging lanes.",
            tags: ["EXO-Centric", "Task Labels"],
            availability: "On-demand",
            hours: "410 hrs",
            pathLabel: "warehouse/material/palletJack",
            images: imageSet("warehouse/palletjack_1.png", "warehouse/palletjack_2.png", "warehouse/palletjack_3.png", "warehouse/palletjack_4.png"),
          },
        ],
      },
      {
        id: "inventory",
        title: "Inventory & QC",
        countLabel: "4 datasets",
        cards: [
          ROOT_SHOWCASE_SECTIONS[1].cards[2],
          ROOT_SHOWCASE_SECTIONS[1].cards[3],
          {
            title: "Receiving & Putaway",
            description: "Receiving dock to shelf workflows covering scan, location, and placement confirmation.",
            tags: ["EXO-Centric", "Task Labels", "Bbox"],
            availability: "On-demand",
            hours: "380 hrs",
            pathLabel: "warehouse/inventory/putaway",
            images: imageSet("warehouse/warehouse1.png", "warehouse/warehouse2.png", "warehouse/warehouse4.png", "warehouse/warehouse3.png"),
          },
          {
            title: "Barcode Exception Review",
            description: "Manual exception handling around unreadable scans, mismatched counts, and inventory reconciliation checks.",
            tags: ["EGO-Centric", "Task Labels", "Edge Cases"],
            availability: "On-demand",
            hours: "320 hrs",
            pathLabel: "warehouse/inventory/barcodeException",
            images: imageSet("warehouse/barcode_1.png", "warehouse/barcode_2.png", "warehouse/barcode_3.png", "warehouse/barcode_4.png"),
          },
        ],
      },
    ],
    ctaTitle: "Ready to train smarter robots?",
    ctaDescription:
      "Structured, fully-labelled warehouse datasets captured from live fulfilment environments - plug directly into your robotics training pipeline today.",
  },
  carAutomation: {
    routeKey: "carAutomation",
    breadcrumbLabel: "CARAUTOMATION",
    heroEyebrow: "Automotive · Robotics AI",
    heroTitle: "RoboDataHub Automotive",
    heroDescription:
      "High-fidelity, fully-labelled manufacturing datasets captured from live OEM production floors - built for robotics automation training pipelines.",
    heroImagePath: "carAutomation/carAutomation2.png",
    heroVideoBlobPath: "carAutomation/BMW/frontGrille/preview/hover.mp4",
    heroBadge: "Featured · Robotics AI",
    heroPill: "34 datasets available",
    stats: [
      { value: "5,500+", label: "Total Hours" },
      { value: "6 OEMs", label: "Partner Brands" },
      { value: "34 ds", label: "Total Datasets" },
      { value: "98.4%", label: "Label Accuracy" },
      { value: "10 types", label: "Operation Classes" },
    ],
    filters: [
      { id: "all", label: "All Tasks", dotClassName: "bg-violet-600" },
      { id: "assembly", label: "Assembly", dotClassName: "bg-violet-400" },
      { id: "inspection", label: "Inspection & QC", dotClassName: "bg-violet-500" },
      { id: "paint", label: "Paint & Finish", dotClassName: "bg-violet-300" },
      { id: "wiring", label: "Wiring & Sensors", dotClassName: "bg-violet-700" },
      { id: "cars", label: "Cars", dotClassName: "bg-violet-800" },
    ],
    sections: [
      {
        id: "assembly",
        title: "Assembly",
        countLabel: "7 datasets",
        cards: [
          ROOT_SHOWCASE_SECTIONS[3].cards[0],
          ROOT_SHOWCASE_SECTIONS[3].cards[1],
          {
            title: "Windshield Replacement",
            description: "Windshield removal and replacement workflow covering glass handling, adhesive prep, and final seating alignment.",
            tags: ["EXO-Centric", "Task Labels", "Glass Handling"],
            availability: "In Library",
            hours: "880 hrs",
            pathLabel: "carAutomation/multi/windshieldInstall",
            images: imageSet("carAutomation/carAutomation4.png", "carAutomation/carAutomation3.png", "carAutomation/carAutomation2.png", "carAutomation/carAutomation5.png"),
            livePathHints: ["windshieldReplacement"],
          },
          {
            title: "Door Panel Assembly",
            description: "Cabin-side door panel assembly with trim placement, clip engagement, and final fit checks on a Toyota line.",
            tags: ["EXO-Centric", "Task Labels", "Interior Assembly"],
            availability: "In Library",
            hours: "760 hrs",
            pathLabel: "carAutomation/multi/doorPanelTrim",
            images: imageSet("carAutomation/carAutomation3.png", "carAutomation/carAutomation2.png", "carAutomation/carAutomation5.png", "carAutomation/carAutomation4.png"),
            livePathHints: ["doorpanelAssembly"],
          },
          {
            title: "Dashboard & Console Fitment",
            description: "Center-console and dashboard placement workflows with multi-point alignment.",
            tags: ["EGO-Centric", "Task Labels"],
            availability: "On-demand",
            hours: "690 hrs",
            pathLabel: "carAutomation/multi/dashboardFitment",
            images: imageSet("carAutomation/dashboard_1.png", "carAutomation/dashboard_2.png", "carAutomation/dashboard_3.png", "carAutomation/dashboard_4.png"),
          },
          {
            title: "Audi Door Panel Assembly",
            description: "Audi-specific trim, handle, and clip workflows from passenger-compartment assembly lines.",
            tags: ["EXO-Centric", "Task Labels"],
            availability: "On-demand",
            hours: "730 hrs",
            pathLabel: "carAutomation/Audi/doorPanel",
            images: imageSet("carAutomation/carAutomation2.png", "carAutomation/carAutomation4.png", "carAutomation/carAutomation3.png", "carAutomation/carAutomation5.png"),
          },
          {
            title: "Seat Rail Alignment",
            description: "Assembly-stage seat rail positioning and final alignment checks before cabin trim completion and bolt-down.",
            tags: ["EXO-Centric", "Task Labels", "Interior Assembly"],
            availability: "On-demand",
            hours: "610 hrs",
            pathLabel: "carAutomation/multi/seatRailAlignment",
            images: imageSet("carAutomation/seatrail_1.png", "carAutomation/seatrail_2.png", "carAutomation/seatrail_3.png", "carAutomation/seatrail_4.png"),
          },
        ],
      },
      {
        id: "inspection",
        title: "Inspection & QC",
        countLabel: "4 datasets",
        cards: [
          ROOT_SHOWCASE_SECTIONS[3].cards[2],
          {
            title: "Door Alignment Inspection",
            description: "Final alignment checks around door seating, gap consistency, and latch-side fit after body-side adjustment.",
            tags: ["EXO-Centric", "Task Labels", "Fit Check"],
            availability: "In Library",
            hours: "610 hrs",
            pathLabel: "carAutomation/BMW/gapInspect",
            images: imageSet("carAutomation/carAutomation2.png", "carAutomation/carAutomation5.png", "carAutomation/carAutomation4.png", "carAutomation/carAutomation3.png"),
            livePathHints: ["doorAlignment"],
          },
          {
            title: "Paint Defect Detection",
            description: "Surface anomaly review for scratches, bubbles, and finish inconsistency.",
            tags: ["EGO-Centric", "Defect Labels"],
            availability: "On-demand",
            hours: "540 hrs",
            pathLabel: "carAutomation/multi/paintDefect",
            images: imageSet("carAutomation/paintdefect_1.png", "carAutomation/paintdefect_2.png", "carAutomation/paintdefect_3.png", "carAutomation/paintdefect_4.png"),
          },
          {
            title: "Wheel Bolt Torque Verification",
            description: "Wheel bolt tightening and digital torque verification workflow focused on final fastener sign-off.",
            tags: ["EXO-Centric", "Task Labels", "Torque Check"],
            availability: "In Library",
            hours: "520 hrs",
            pathLabel: "carAutomation/multi/torqueScan",
            images: imageSet("carAutomation/carAutomation3.png", "carAutomation/carAutomation5.png", "carAutomation/carAutomation4.png", "carAutomation/carAutomation2.png"),
            livePathHints: ["wheelBolts"],
          },
        ],
      },
      {
        id: "paint",
        title: "Paint & Finish",
        countLabel: "4 datasets",
        cards: [
          {
            title: "Audi Paint Surface QC Scan",
            description: "Finish inspection and reflection-driven scan routes for premium body panels.",
            tags: ["EGO-Centric", "Defect Labels"],
            availability: "On-demand",
            hours: "470 hrs",
            pathLabel: "carAutomation/Audi/paintQC",
            images: imageSet("carAutomation/carAutomation4.png", "carAutomation/carAutomation2.png", "carAutomation/carAutomation5.png", "carAutomation/carAutomation3.png"),
          },
          {
            title: "Spray Paint Application",
            description: "Spray-path coverage and finish application captured from live booth operations.",
            tags: ["EXO-Centric", "Task Labels"],
            availability: "On-demand",
            hours: "690 hrs",
            pathLabel: "carAutomation/multi/sprayPaint",
            images: imageSet("carAutomation/spraypaint_1.png", "carAutomation/spraypaint_2.png", "carAutomation/spraypaint_3.png", "carAutomation/spraypaint_4.png"),
          },
          {
            title: "Surface Sanding & Prep",
            description: "Prep-stage smoothing and finish preparation before coating and seal workflows.",
            tags: ["EXO-Centric", "Task Labels"],
            availability: "On-demand",
            hours: "560 hrs",
            pathLabel: "carAutomation/multi/surfacePrep",
            images: imageSet("carAutomation/carAutomation3.png", "carAutomation/carAutomation2.png", "carAutomation/carAutomation4.png", "carAutomation/carAutomation5.png"),
          },
          {
            title: "Body Panel Seam Sealing",
            description: "Seal-bead application and post-pass inspection around panel seams and joints.",
            tags: ["EXO-Centric", "Task Labels"],
            availability: "On-demand",
            hours: "430 hrs",
            pathLabel: "carAutomation/multi/seamSeal",
            images: imageSet("carAutomation/bodyseam_1.png", "carAutomation/bodyseam_2.png", "carAutomation/bodyseam_3.png", "carAutomation/bodyseam_4.png"),
          },
        ],
      },
      {
        id: "wiring",
        title: "Wiring & Sensors",
        countLabel: "4 datasets",
        cards: [
          {
            title: "Engine Harness Routing",
            description: "Harness routing across engine bays with placement, clipping, and verification steps.",
            tags: ["EGO-Centric", "Task Labels"],
            availability: "On-demand",
            hours: "860 hrs",
            pathLabel: "carAutomation/multi/engineHarness",
            images: imageSet("carAutomation/carAutomation3.png", "carAutomation/carAutomation2.png", "carAutomation/carAutomation5.png", "carAutomation/carAutomation4.png"),
          },
          {
            title: "Sensor Module Installation",
            description: "Sensor placement, fastening, and verification around distributed vehicle modules.",
            tags: ["EXO-Centric", "Bbox"],
            availability: "On-demand",
            hours: "720 hrs",
            pathLabel: "carAutomation/multi/sensorModule",
            images: imageSet("carAutomation/carAutomation5.png", "carAutomation/carAutomation3.png", "carAutomation/carAutomation4.png", "carAutomation/carAutomation2.png"),
          },
          {
            title: "Interior Connector Plug-In",
            description: "Connector insertion, clip confirmation, and cable-management steps within cabin fitment.",
            tags: ["EGO-Centric", "Edge Cases"],
            availability: "On-demand",
            hours: "490 hrs",
            pathLabel: "carAutomation/multi/connectorPlugIn",
            images: imageSet("carAutomation/connector_1.png", "carAutomation/connector_2.png", "carAutomation/connector_3.png", "carAutomation/connector_4.png"),
          },
          {
            title: "Audi Sensor Array Wiring",
            description: "Audi-specific sensor array harness handling and connection verification routines.",
            tags: ["EGO-Centric", "Task Labels"],
            availability: "On-demand",
            hours: "410 hrs",
            pathLabel: "carAutomation/Audi/sensorWiring",
            images: imageSet("carAutomation/carAutomation3.png", "carAutomation/carAutomation2.png", "carAutomation/carAutomation4.png", "carAutomation/carAutomation5.png"),
          },
        ],
      },
      {
        id: "cars",
        title: "Cars",
        countLabel: "6 datasets",
        cards: [
          {
            title: "BMW 3-Series Full Exterior",
            description: "Full-vehicle exterior coverage for inspection and automation policy context.",
            tags: ["EXO-Centric", "360° Capture"],
            availability: "On-demand",
            hours: "1,800 hrs",
            pathLabel: "carAutomation/BMW/3series/exterior",
            images: imageSet("carAutomation/carAutomation2.png", "carAutomation/carAutomation5.png", "carAutomation/carAutomation3.png", "carAutomation/carAutomation4.png"),
          },
          {
            title: "Ford F-150 Cabin Interior",
            description: "Interior coverage across seats, center console, and door-side interaction zones.",
            tags: ["EGO-Centric", "Task Labels"],
            availability: "On-demand",
            hours: "1,450 hrs",
            pathLabel: "carAutomation/Ford/f150/cabin",
            images: imageSet("carAutomation/carAutomation3.png", "carAutomation/carAutomation4.png", "carAutomation/carAutomation2.png", "carAutomation/carAutomation5.png"),
          },
          {
            title: "Toyota Camry Rear Assembly",
            description: "Rear-assembly viewpoint and operations coverage across bumper and fascia workflows.",
            tags: ["EXO-Centric", "Bbox"],
            availability: "On-demand",
            hours: "1,120 hrs",
            pathLabel: "carAutomation/Toyota/camry/rear",
            images: imageSet("carAutomation/carAutomation5.png", "carAutomation/carAutomation2.png", "carAutomation/carAutomation4.png", "carAutomation/carAutomation3.png"),
          },
          {
            title: "BMW Passenger Compartment",
            description: "Passenger-side compartment coverage for trim, seat, and connector interactions.",
            tags: ["EGO-Centric", "Seg"],
            availability: "On-demand",
            hours: "980 hrs",
            pathLabel: "carAutomation/BMW/passenger",
            images: imageSet("carAutomation/BMWseat_1.png", "carAutomation/BMWseat_2.png", "carAutomation/BMWseat_3.png", "carAutomation/BMWseat_4.png"),
          },
          {
            title: "Multi-Brand Door Fitment",
            description: "Door-side fitment and latch workflows across multiple vehicle programs.",
            tags: ["EXO-Centric", "Edge Cases"],
            availability: "On-demand",
            hours: "2,200 hrs",
            pathLabel: "carAutomation/multi/doorFitment",
            images: imageSet("carAutomation/carAutomation2.png", "carAutomation/carAutomation3.png", "carAutomation/carAutomation4.png", "carAutomation/carAutomation5.png"),
          },
          {
            title: "Audi A4 Passenger Compartment",
            description: "Passenger-compartment coverage for fitment, trim, and interaction checks.",
            tags: ["EGO-Centric", "Seg"],
            availability: "On-demand",
            hours: "980 hrs",
            pathLabel: "carAutomation/Audi/a4/passenger",
            images: imageSet("carAutomation/audia4comp_1.png", "carAutomation/audia4comp_2.png", "carAutomation/audia4comp_3.png", "carAutomation/audia4comp_4.png"),
          },
        ],
      },
    ],
    ctaTitle: "Ready to train smarter robots?",
    ctaDescription:
      "Structured, fully-labelled automotive datasets captured from live OEM production environments - plug directly into your robotics training pipeline today.",
  },
};
