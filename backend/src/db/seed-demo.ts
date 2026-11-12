import bcrypt from 'bcrypt';
import { getDb, migrate } from './index.js';
import { nowIso } from '../utils/time.js';

type Slot = { day: number; start: string; end: string };

type DemoSitter = {
  email: string;
  firstName: string;
  age: number;
  city: string;
  postalCode: string;
  bio: string;
  experience: string;
  hourlyRate: number;
  phone: string;
  phonePublic: number;
  verification: 'verified' | 'pending' | 'unverified';
  slots: Slot[];
};

const sitters: DemoSitter[] = [
  {
    email: 'camille@sittr.local',
    firstName: 'Camille',
    age: 28,
    city: 'Lyon',
    postalCode: '69003',
    bio: 'J’aime les soirées calmes, les histoires et les routines du coucher. Je préviens toujours si je dois partir un peu plus tôt.',
    experience: '6 ans auprès d’enfants de 2 à 10 ans, surtout en soirée après l’école.',
    hourlyRate: 13,
    phone: '+33612000001',
    phonePublic: 1,
    verification: 'verified',
    slots: [
      { day: 1, start: '17:30', end: '21:00' },
      { day: 3, start: '17:30', end: '21:00' },
    ],
  },
  {
    email: 'ines@sittr.local',
    firstName: 'Inès',
    age: 23,
    city: 'Villeurbanne',
    postalCode: '69100',
    bio: 'Étudiante, disponible le week-end. Je propose des jeux, un goûter et les devoirs si besoin.',
    experience: '3 ans en garde ponctuelle, y compris des fratries.',
    hourlyRate: 11,
    phone: '+33612000002',
    phonePublic: 0,
    verification: 'verified',
    slots: [
      { day: 6, start: '09:00', end: '18:00' },
      { day: 0, start: '09:00', end: '13:00' },
    ],
  },
  {
    email: 'malik@sittr.local',
    firstName: 'Malik',
    age: 31,
    city: 'Lyon',
    postalCode: '69007',
    bio: 'Parent moi-même, je garde des enfants le soir. Les consignes écrites me conviennent très bien.',
    experience: '8 ans, enfants de 1 à 12 ans. À l’aise avec les repas et le coucher.',
    hourlyRate: 15,
    phone: '+33612000003',
    phonePublic: 1,
    verification: 'verified',
    slots: [
      { day: 5, start: '18:00', end: '23:00' },
      { day: 6, start: '18:00', end: '23:00' },
    ],
  },
  {
    email: 'lea@sittr.local',
    firstName: 'Léa',
    age: 19,
    city: 'Nantes',
    postalCode: '44000',
    bio: 'Je commence les gardes. Je suis ponctuelle et j’aime les activités manuelles.',
    experience: '1 an de baby-sitting le mercredi et pendant les vacances courtes.',
    hourlyRate: 10,
    phone: '+33612000004',
    phonePublic: 1,
    verification: 'unverified',
    slots: [{ day: 3, start: '12:00', end: '18:30' }],
  },
  {
    email: 'chloe@sittr.local',
    firstName: 'Chloé',
    age: 34,
    city: 'Bordeaux',
    postalCode: '33000',
    bio: 'Calme et organisée. Je peux aussi accompagner à une activité sportive proche.',
    experience: '10 ans, dont des gardes régulières en soirée et pendant les vacances.',
    hourlyRate: 14,
    phone: '+33612000005',
    phonePublic: 1,
    verification: 'verified',
    slots: [
      { day: 2, start: '18:00', end: '22:00' },
      { day: 4, start: '18:00', end: '22:00' },
    ],
  },
  {
    email: 'adam@sittr.local',
    firstName: 'Adam',
    age: 26,
    city: 'Lille',
    postalCode: '59000',
    bio: 'Je garde surtout après l’école. Les devoirs et le goûter font partie du rituel.',
    experience: '4 ans auprès d’enfants de primaire.',
    hourlyRate: 12,
    phone: '+33612000006',
    phonePublic: 0,
    verification: 'pending',
    slots: [
      { day: 1, start: '16:30', end: '19:30' },
      { day: 2, start: '16:30', end: '19:30' },
      { day: 4, start: '16:30', end: '19:30' },
    ],
  },
];

migrate();
const db = getDb();
const passwordHash = bcrypt.hashSync('DemoSittr123!', 10);
const createdAt = nowIso();

const insertUser = db.prepare(
  `INSERT INTO users (email, password_hash, role, created_at) VALUES (?, ?, ?, ?)`,
);
const insertProfile = db.prepare(
  `INSERT INTO profiles (
     user_id, first_name, age, city, postal_code, bio, experience,
     hourly_rate, phone, phone_public, verification_status, updated_at
   ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
);
const insertSlot = db.prepare(
  `INSERT INTO availabilities (user_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?)`,
);

const createSitter = db.transaction((person: DemoSitter) => {
  const existing = db
    .prepare(`SELECT id FROM users WHERE email = ? COLLATE NOCASE`)
    .get(person.email) as { id: number } | undefined;
  if (existing) return;
  const result = insertUser.run(person.email, passwordHash, 'babysitter', createdAt);
  const userId = Number(result.lastInsertRowid);
  insertProfile.run(
    userId,
    person.firstName,
    person.age,
    person.city,
    person.postalCode,
    person.bio,
    person.experience,
    person.hourlyRate,
    person.phone,
    person.phonePublic,
    person.verification,
    createdAt,
  );
  for (const slot of person.slots) {
    insertSlot.run(userId, slot.day, slot.start, slot.end);
  }
});

for (const person of sitters) createSitter(person);

const parentEmail = 'parent@sittr.local';
const parent = db
  .prepare(`SELECT id FROM users WHERE email = ? COLLATE NOCASE`)
  .get(parentEmail);
if (!parent) {
  const result = insertUser.run(parentEmail, passwordHash, 'parent', createdAt);
  db.prepare(
    `INSERT INTO profiles (user_id, first_name, city, postal_code, updated_at) VALUES (?, ?, ?, ?, ?)`,
  ).run(Number(result.lastInsertRowid), 'Claire', 'Lyon', '69003', createdAt);
}

console.log('Comptes de démonstration prêts. Mot de passe : DemoSittr123!');
