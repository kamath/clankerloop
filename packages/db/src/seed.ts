import { db, closeConnection } from './index';
import { languages, difficulties } from './schema';

/**
 * Seed the database with initial enum values
 */
async function seed() {
  console.log('Seeding database...');

  // Seed languages
  const languageValues = [
    { name: 'javascript' },
    { name: 'typescript' },
    { name: 'python' },
  ];

  console.log('Inserting languages...');
  await db
    .insert(languages)
    .values(languageValues)
    .onConflictDoNothing();

  // Seed difficulties
  const difficultyValues = [
    { name: 'easy' },
    { name: 'medium' },
    { name: 'hard' },
  ];

  console.log('Inserting difficulties...');
  await db
    .insert(difficulties)
    .values(difficultyValues)
    .onConflictDoNothing();

  console.log('Seeding complete!');
}

seed()
  .catch((error) => {
    console.error('Error seeding database:', error);
    process.exit(1);
  })
  .finally(async () => {
    await closeConnection();
  });
