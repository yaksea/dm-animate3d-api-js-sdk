const path = require('path');

const repoRoot = path.join(__dirname, '../', 'test_data');

module.exports = {
    video: path.join(repoRoot, 'video.mp4'),
    multiPersonVideo: path.join(repoRoot, 'multi_person.mp4'),
    testCharacterGlb: path.join(repoRoot, 'test_character.glb'),
};
