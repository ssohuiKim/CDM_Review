/**
 * 파일 포맷 자동 감지 및 파싱 유틸리티
 * txt, tsv, csv 파일 포맷을 자동으로 감지하고 적절한 구분자를 결정합니다.
 */

export class FileFormatDetector {
  constructor() {
    this.delimiters = [
      { char: '\t', name: 'Tab (TSV)', weight: 1.2 },  // TSV 우선순위 높임
      { char: ',', name: 'Comma (CSV)', weight: 1.0 },
      { char: ' ', name: 'Space (TXT)', weight: 0.8 } // Space는 우선순위 낮춤
    ];
  }

  /**
   * 파일 내용을 분석하여 최적의 구분자를 감지합니다.
   * @param {string} content - 파일 내용
   * @param {string} filename - 파일명 (확장자 힌트용)
   * @returns {Object} 감지 결과
   */
  detectFormat(content, filename = '') {
    const lines = this.preprocessLines(content);
    
    if (lines.length < 2) {
      throw new Error('파일에 충분한 데이터가 없습니다. 최소 2줄 이상이 필요합니다.');
    }

    // 파일 확장자 힌트
    const extensionHint = this.getExtensionHint(filename);
    
    // 각 구분자에 대한 점수 계산
    const scores = this.delimiters.map(delimiter => {
      const score = this.calculateDelimiterScore(lines, delimiter);
      // 확장자 힌트 적용
      if (extensionHint && extensionHint.preferred === delimiter.char) {
        score.totalScore *= 1.5; // 확장자 힌트 보너스
      }
      return { ...delimiter, ...score };
    });

    // 최고 점수의 구분자 선택
    const bestDelimiter = scores.reduce((best, current) => 
      current.totalScore > best.totalScore ? current : best
    );

    // 결과 검증
    if (bestDelimiter.totalScore < 0.5) {
      throw new Error('적절한 구분자를 찾을 수 없습니다. 파일 포맷을 확인해주세요.');
    }

    return {
      delimiter: bestDelimiter.char,
      delimiterName: bestDelimiter.name,
      confidence: Math.min(bestDelimiter.totalScore, 1.0),
      analysis: scores,
      preview: this.generatePreview(lines, bestDelimiter.char),
      duckdbDelimiter: this.getDuckDBDelimiter(bestDelimiter.char)
    };
  }

  /**
   * 파일 내용을 전처리하여 분석 가능한 형태로 변환
   */
  preprocessLines(content) {
    return content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .slice(0, 10); // 처음 10줄만 분석
  }

  /**
   * 파일 확장자로부터 힌트 얻기
   */
  getExtensionHint(filename) {
    const ext = filename.toLowerCase().split('.').pop();
    const hints = {
      'csv': { preferred: ',', confidence: 0.8 },
      'tsv': { preferred: '\t', confidence: 0.9 },
      'txt': null // txt는 힌트 없음
    };
    return hints[ext] || null;
  }

  /**
   * 특정 구분자에 대한 점수 계산
   */
  calculateDelimiterScore(lines, delimiter) {
    const { char, weight } = delimiter;
    const counts = [];
    let validLines = 0;
    let hasConsistentStructure = true;

    // 각 줄에서 구분자 개수 세기
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.length === 0) continue;

      let count = this.countDelimiters(line, char);
      
      if (count > 0) {
        counts.push(count);
        validLines++;
      }
    }

    if (counts.length === 0) {
      return { totalScore: 0, consistency: 0, avgCount: 0, validLines: 0 };
    }

    // 일관성 계산
    const avgCount = counts.reduce((sum, c) => sum + c, 0) / counts.length;
    const maxCount = Math.max(...counts);
    const minCount = Math.min(...counts);
    
    // 일관성: 최대값과 최소값의 차이가 작을수록 높은 점수
    const consistency = maxCount > 0 ? 1 - (maxCount - minCount) / maxCount : 0;
    
    // 특별한 케이스들 처리
    let penalty = 0;
    
    // 공백 구분자의 경우 추가 검증
    if (char === ' ') {
      penalty = this.validateSpaceDelimiter(lines);
    }
    
    // 탭 구분자의 경우 공백과의 혼동 방지
    if (char === '\t') {
      const spaceCount = this.countDelimiters(lines[0], ' ');
      if (spaceCount > avgCount) {
        penalty = 0.2; // 공백이 더 많으면 탭의 신뢰도 감소
      }
    }

    // 총 점수 계산
    const baseScore = avgCount * consistency * (validLines / lines.length);
    const totalScore = Math.max(0, (baseScore * weight) - penalty);

    return {
      totalScore,
      consistency,
      avgCount,
      validLines,
      penalty
    };
  }

  /**
   * 구분자 개수 세기
   */
  countDelimiters(line, delimiter) {
    if (delimiter === ' ') {
      // 공백의 경우 연속된 공백을 하나로 처리
      const parts = line.trim().split(/\s+/);
      return parts.length > 1 ? parts.length - 1 : 0;
    } else if (delimiter === '\t') {
      return (line.match(/\t/g) || []).length;
    } else {
      return (line.match(new RegExp('\\' + delimiter, 'g')) || []).length;
    }
  }

  /**
   * 공백 구분자 특별 검증
   */
  validateSpaceDelimiter(lines) {
    let penalty = 0;
    
    // 따옴표 안의 공백이 있는지 확인
    for (const line of lines.slice(0, 3)) {
      if (/"[^"]*\s+[^"]*"/.test(line) || /'[^']*\s+[^']*'/.test(line)) {
        penalty += 0.3; // 따옴표 안 공백 발견 시 패널티
      }
    }
    
    // 연속된 공백이 많은지 확인
    for (const line of lines.slice(0, 3)) {
      const multiSpaceMatches = line.match(/\s{2,}/g);
      if (multiSpaceMatches && multiSpaceMatches.length > 2) {
        penalty += 0.2; // 연속 공백이 많으면 패널티
      }
    }
    
    return Math.min(penalty, 0.8); // 최대 패널티 제한
  }

  /**
   * 파일 미리보기 생성
   */
  generatePreview(lines, delimiter) {
    const previewLines = lines.slice(0, 5);
    return previewLines.map(line => {
      if (delimiter === '\t') {
        return line.replace(/\t/g, ' → ');
      } else if (delimiter === ' ') {
        return line.replace(/\s+/g, ' | ');
      } else {
        return line.replace(new RegExp('\\' + delimiter, 'g'), ` ${delimiter} `);
      }
    });
  }

  /**
   * DuckDB에서 사용할 구분자 형식으로 변환
   */
  getDuckDBDelimiter(delimiter) {
    const delimiterMap = {
      '\t': '\t',
      ',': ',',
      ' ': ' '
    };
    return delimiterMap[delimiter] || delimiter;
  }

  /**
   * 파일 포맷 감지 결과를 사용자 친화적인 메시지로 변환
   */
  formatDetectionResult(result) {
    const confidencePercent = Math.round(result.confidence * 100);
    let message = `감지된 파일 포맷: ${result.delimiterName} (신뢰도: ${confidencePercent}%)`;
    
    if (result.confidence > 0.8) {
      message += ' ✅ 높은 신뢰도';
    } else if (result.confidence > 0.6) {
      message += ' ⚠️ 보통 신뢰도';
    } else {
      message += ' ❌ 낮은 신뢰도 - 수동 확인 권장';
    }
    
    return message;
  }
}

// 편의 함수들
export function detectFileFormat(content, filename) {
  const detector = new FileFormatDetector();
  const result = detector.detectFormat(content, filename);
  
  // 영어 이름으로 매핑
  const englishNames = {
    'Tab (TSV)': 'Tab (TSV)',
    'Comma (CSV)': 'Comma (CSV)', 
    'Space (TXT)': 'Space (TXT)',
    '탭(Tab)': 'Tab (TSV)',
    '콤마(Comma)': 'Comma (CSV)',
    '공백(Space)': 'Space (TXT)'
  };
  
  // delimiterName을 영어로 변환
  result.delimiterName = englishNames[result.delimiterName] || result.delimiterName;
  
  return result;
}

export function createDuckDBQuery(tableName, fileName, delimiter) {
  const delimiterMap = {
    '\t': "delim='\\t'",
    ',': "delim=','", 
    ' ': "delim=' '"
  };
  
  const delimiterParam = delimiterMap[delimiter] || "delim='\\t'";
  
  return `CREATE TABLE ${tableName} AS SELECT * FROM read_csv_auto('${fileName}', ${delimiterParam});`;
}
