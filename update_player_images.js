const fs = require('fs');
const path = require('path');

// 선수 이미지 폴더 경로
const IMAGES_DIR = './assets/players_image';
const PLAYERS_FILE = './data/players.js';

// 이미지 파일 확장자
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

// 선수명과 이미지 파일명 매칭 함수
function findMatchingImage(playerName, imageFiles) {
  // 선수명에서 특수문자 제거하고 소문자로 변환
  const normalizedPlayerName = playerName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // 이미지 파일명에서 확장자 제거하고 소문자로 변환
  const normalizedImageNames = imageFiles.map(file => ({
    original: file,
    normalized: file
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  }));

  // 정확한 매칭 찾기
  let exactMatch = normalizedImageNames.find(img => 
    img.normalized === normalizedPlayerName
  );
  if (exactMatch) return exactMatch.original;

  // 부분 매칭 찾기 (선수명이 이미지명에 포함되는 경우)
  let partialMatch = normalizedImageNames.find(img => 
    img.normalized.includes(normalizedPlayerName) || 
    normalizedPlayerName.includes(img.normalized)
  );
  if (partialMatch) return partialMatch.original;

  // 유사도 기반 매칭 (Levenshtein 거리)
  let bestMatch = null;
  let bestScore = Infinity;
  
  for (const img of normalizedImageNames) {
    const distance = levenshteinDistance(normalizedPlayerName, img.normalized);
    if (distance < bestScore && distance <= 5) { // 거리가 5 이하인 경우만 매칭
      bestScore = distance;
      bestMatch = img.original;
    }
  }

  return bestMatch;
}

// Levenshtein 거리 계산 함수
function levenshteinDistance(str1, str2) {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

// 메인 함수
function updatePlayerImages() {
  try {
    // 이미지 파일 목록 가져오기
    const imageFiles = fs.readdirSync(IMAGES_DIR)
      .filter(file => IMAGE_EXTENSIONS.includes(path.extname(file).toLowerCase()));

    console.log(`📁 발견된 이미지 파일: ${imageFiles.length}개`);
    console.log('이미지 파일들:', imageFiles);

    // players.js 파일 읽기
    const playersContent = fs.readFileSync(PLAYERS_FILE, 'utf8');
    
    // 선수 데이터 추출 (JSON 부분만)
    const playersMatch = playersContent.match(/const players = (\[[\s\S]*\]);/);
    if (!playersMatch) {
      throw new Error('players 배열을 찾을 수 없습니다.');
    }

    const players = JSON.parse(playersMatch[1]);
    console.log(`\n👥 총 선수 수: ${players.length}명`);

    // 각 선수에 대해 이미지 매칭
    let updatedCount = 0;
    let matchedImages = [];
    let unmatchedPlayers = [];

    for (const player of players) {
      const playerName = player.Profile;
      const matchingImage = findMatchingImage(playerName, imageFiles);
      
      if (matchingImage) {
        player.Image = `assets/players_image/${matchingImage}`;
        updatedCount++;
        matchedImages.push(`${playerName} → ${matchingImage}`);
      } else {
        unmatchedPlayers.push(playerName);
      }
    }

    // 결과 출력
    console.log(`\n✅ 이미지 매칭 완료: ${updatedCount}명`);
    console.log(`❌ 매칭 실패: ${unmatchedPlayers.length}명`);
    
    if (matchedImages.length > 0) {
      console.log('\n📸 매칭된 이미지들:');
      matchedImages.forEach(match => console.log(`  ${match}`));
    }
    
    if (unmatchedPlayers.length > 0) {
      console.log('\n⚠️  이미지가 없는 선수들:');
      unmatchedPlayers.forEach(player => console.log(`  ${player}`));
    }

    // 업데이트된 players.js 파일 생성
    const updatedContent = playersContent.replace(
      /const players = (\[[\s\S]*\]);/,
      `const players = ${JSON.stringify(players, null, 2)};`
    );

    // 백업 파일 생성
    const backupFile = `${PLAYERS_FILE}.backup.${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`;
    fs.writeFileSync(backupFile, playersContent);
    console.log(`\n💾 백업 파일 생성: ${backupFile}`);

    // 업데이트된 파일 저장
    fs.writeFileSync(PLAYERS_FILE, updatedContent);
    console.log(`\n💾 players.js 파일이 업데이트되었습니다.`);

    // 매칭 결과를 별도 파일로 저장
    const reportContent = `# 선수 이미지 매칭 결과

생성 시간: ${new Date().toLocaleString()}

## 📊 요약
- 총 선수 수: ${players.length}명
- 이미지 매칭 성공: ${updatedCount}명
- 이미지 매칭 실패: ${unmatchedPlayers.length}명

## 📸 매칭된 이미지들
${matchedImages.map(match => `- ${match}`).join('\n')}

## ⚠️ 이미지가 없는 선수들
${unmatchedPlayers.map(player => `- ${player}`).join('\n')}

## 🔍 수동 확인이 필요한 경우들
이미지 파일명과 선수명이 정확히 일치하지 않는 경우, 수동으로 확인하여 파일명을 변경하거나 매칭 로직을 조정해야 할 수 있습니다.
`;

    fs.writeFileSync('image_matching_report.md', reportContent);
    console.log(`\n📋 매칭 결과 리포트가 'image_matching_report.md' 파일로 저장되었습니다.`);

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    process.exit(1);
  }
}

// 스크립트 실행
if (require.main === module) {
  updatePlayerImages();
}

module.exports = { updatePlayerImages, findMatchingImage };
