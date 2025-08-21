const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

const inputFile = path.join(__dirname, 'battles.csv');
const outputFile = path.join(__dirname, 'emcees.json');

const emcees = new Set();

const addEmcee = (emceeName) => {
  if (!emceeName) return;
  emceeName.split('/').forEach(name => {
    const trimmedName = name.trim();
    if (trimmedName) {
      emcees.add(trimmedName);
    }
  });
};

fs.createReadStream(inputFile)
  .pipe(csv({
    mapHeaders: ({ header }) => header.trim(),
    mapValues: ({ value }) => value.trim()
  }))
  .on('data', (row) => {
    addEmcee(row['Column A']);
    addEmcee(row['Column B']);
  })
  .on('end', () => {
    const sortedEmcees = Array.from(emcees).sort((a, b) => a.localeCompare(b));
    
    fs.writeFileSync(outputFile, JSON.stringify(sortedEmcees, null, 2));
    console.log(`Successfully extracted ${sortedEmcees.length} unique emcee names to ${outputFile}`);
    
    console.log('Sample of emcees:');
    console.log(sortedEmcees.slice(0, 10).join(', '));
    console.log('...');
  })
  .on('error', (error) => {
    console.error('Error processing CSV:', error);
  });
