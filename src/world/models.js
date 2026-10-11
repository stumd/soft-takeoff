import * as room from './room.js';
import * as garden from './garden.js';
import * as street from './street.js';
import * as city from './city.js';
import * as sky from './sky.js';
import * as fx from './fx.js';
import { surrounds } from './surrounds.js';
import { person, dog, robot, snowman } from './people.js';

export const MODELS = {
  // interior
  walls: room.walls,
  floor: room.floor,
  kitchen: room.kitchen,
  fridge: room.fridge,
  kettle: room.kettle,
  pip: room.pip,
  radio: room.radio,
  table: room.table,
  chair: room.chair,
  armchair: room.armchair,
  rug: room.rug,
  floorLamp: room.floorLamp,
  pendant: room.pendant,
  bookshelf: room.bookshelf,
  calendar: room.calendar,
  clock: room.clock,
  photo: room.photoFrame,
  dogBed: room.dogBed,
  laptop: room.laptop,
  tablet: room.tablet,
  mug: room.mug,
  paper: room.paper,
  fan: room.fan,
  oxygen: room.oxygen,
  toolbag: room.toolbag,
  hospitalBed: room.hospitalBed,
  sideTable: room.sideTable,
  telescope: room.telescope,
  boxes: room.boxes,
  bench: room.bench,
  // garden
  slab: garden.slab,
  surrounds,
  lawn: garden.lawn,
  hedge: garden.hedge,
  fence: garden.fence,
  tree: garden.appleTree,
  shed: garden.shed,
  vegBed: garden.vegBed,
  grave: garden.grave,
  pool: garden.paddlingPool,
  gardenChairs: garden.gardenChairs,
  greenhouse: garden.greenhouse,
  basket: garden.basket,
  ladder: garden.ladder,
  festoon: garden.lights,
  // people
  person,
  dog,
  robot,
  snowman,
  // street + neighbour
  street: street.street,
  streetTrees: street.streetTrees,
  lampPosts: street.lampPosts,
  car: street.car,
  lorry: street.lorry,
  van: street.van,
  robotaxi: street.robotaxi,
  drone: street.drone,
  courier: street.courier,
  workers: street.workers,
  tomaszHouse: street.tomaszHouse,
  tomaszSign: street.tomaszSign,
  tomaszBanner: street.tomaszBanner,
  tomaszVeg: street.tomaszVeg,
  gnome: street.gnome,
  soldBoard: street.soldBoard,
  billboard: street.billboard,
  // the city
  city: city.city,
  river: city.river,
  riverside: city.riverside,
  cranes: city.cranes,
  meridian: city.meridian,
  datacentres: city.datacentres,
  reactor: city.reactor,
  solarField: city.solarField,
  newTowers: city.newTowers,
  factory: city.factory,
  lattice: city.lattice,
  spindle: city.spindle,
  gardenCity: city.gardenCity,
  // sky (lives on the camera-locked layer)
  stars: sky.stars,
  moon: sky.moon,
  clouds: sky.clouds,
  swarm: sky.swarm,
  ring: sky.ring,
  launches: sky.launches,
  flare: sky.flare,
  // weather / life
  rain: fx.rain,
  snowfall: fx.snowfall,
  motes: fx.motes,
  leaves: fx.leaves,
  petals: fx.petals,
  birds: fx.birds,
  steam: fx.steam,
};

export const SKY_MODELS = new Set(['stars', 'moon', 'clouds', 'swarm', 'ring', 'launches', 'flare']);
// Big distant things rise out of the ground rather than popping in.
export const RISE_MODELS = new Set(['city', 'riverside', 'cranes', 'meridian', 'datacentres', 'reactor', 'solarField', 'newTowers', 'factory', 'lattice', 'spindle', 'gardenCity', 'river']);
export const FADE_MODELS = new Set(['surrounds', 'rain', 'snowfall', 'motes', 'leaves', 'petals', 'birds', 'steam', ...SKY_MODELS]);
