import {join} from 'path';

// ts_examples/ -> repo root
const repoRoot = join(__dirname, '..', 'test_data');

/** Resolved media paths for example scripts. */
export const assetPaths = {
    video: join(repoRoot, 'video.mp4'),
    multiPersonVideo: join(repoRoot, 'multi_person.mp4'),
    testCharacterGlb: join(repoRoot, 'test_character.glb'),
};
