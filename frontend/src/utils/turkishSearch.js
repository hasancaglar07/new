// Türkçe karakter uyumlu arama fonksiyonları

/**
 * Türkçe karakterleri normalize eder
 * Örnek: füyûzât, füyuzat, füyüzat -> fuyuzat
 */
export function normalizeTurkishText(text) {
    if (!text) return '';
    
    const turkishCharMap = {
        'ç': 'c', 'Ç': 'C',
        'ğ': 'g', 'Ğ': 'G',
        'ı': 'i', 'I': 'I',
        'İ': 'I', 'i': 'i',
        'ö': 'o', 'Ö': 'O',
        'ş': 's', 'Ş': 'S',
        'ü': 'u', 'Ü': 'U',
        // Sesli harf varyasyonları
        'â': 'a', 'Â': 'A',
        'à': 'a', 'À': 'A',
        'ê': 'e', 'Ê': 'E',
        'è': 'e', 'È': 'E',
        'î': 'i', 'Î': 'I',
        'ì': 'i', 'Ì': 'I',
        'ô': 'o', 'Ô': 'O',
        'ò': 'o', 'Ò': 'O',
        'û': 'u', 'Û': 'U',
        'ù': 'u', 'Ù': 'U',
        'ű': 'u', 'Ű': 'U',
        'ő': 'o', 'Ő': 'O'
    };
    
    return text.replace(/[çÇğĞıIİiöÖşŞüÜâÂàÀêÊèÈîÎìÌôÔòÒûÛùÙűŰőŐ]/g, char => turkishCharMap[char] || char);
}

/**
 * Türkçe karakter uyumlu arama yapar
 * @param {string} text - Aranacak metin
 * @param {string} searchTerm - Arama terimi
 * @returns {boolean} - Eşleşme durumu
 */
export function turkishIncludes(text, searchTerm) {
    if (!text || !searchTerm) return false;
    
    const normalizedText = normalizeTurkishText(text.toLowerCase());
    const normalizedSearchTerm = normalizeTurkishText(searchTerm.toLowerCase());
    
    return normalizedText.includes(normalizedSearchTerm);
}

/**
 * Türkçe karakter uyumlu fuzzy arama yapar
 * @param {string} text - Aranacak metin
 * @param {string} searchTerm - Arama terimi
 * @param {number} threshold - Benzerlik eşiği (0-1)
 * @returns {boolean} - Eşleşme durumu
 */
export function turkishFuzzyMatch(text, searchTerm, threshold = 0.7) {
    if (!text || !searchTerm) return false;
    
    const normalizedText = normalizeTurkishText(text.toLowerCase());
    const normalizedSearchTerm = normalizeTurkishText(searchTerm.toLowerCase());
    
    // Basit fuzzy matching algoritması
    const similarity = calculateSimilarity(normalizedText, normalizedSearchTerm);
    return similarity >= threshold;
}

/**
 * İki string arasındaki benzerliği hesaplar (Levenshtein distance tabanlı)
 * @param {string} str1 - İlk string
 * @param {string} str2 - İkinci string
 * @returns {number} - Benzerlik oranı (0-1)
 */
function calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
}

/**
 * Levenshtein distance hesaplar
 * @param {string} str1 - İlk string
 * @param {string} str2 - İkinci string
 * @returns {number} - Levenshtein distance
 */
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

/**
 * Metinde arama terimini vurgular (Türkçe karakter uyumlu)
 * @param {string} text - Vurgulanacak metin
 * @param {string} searchTerm - Arama terimi
 * @returns {string} - Vurgulanmış HTML metni
 */
export function highlightTurkishText(text, searchTerm) {
    if (!text || !searchTerm) return text;
    
    const searchTerms = searchTerm.trim().split(/\s+/);
    let result = text;
    
    searchTerms.forEach(term => {
        if (!term) return;
        
        // Türkçe karakter varyasyonlarını içeren regex oluştur
        const turkishCharPattern = {
            'a': '[aâàáä]',
            'c': '[cç]',
            'e': '[eêèéë]',
            'g': '[gğ]',
            'i': '[iıîìíï]',
            'o': '[oöôòóő]',
            's': '[sş]',
            'u': '[uüûùúű]'
        };
        
        let pattern = term.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        // Her karakteri Türkçe varyasyonlarıyla değiştir
        pattern = pattern.replace(/[acegilosu]/g, char => turkishCharPattern[char] || char);
        
        const regex = new RegExp(`(${pattern})`, 'gi');
        
        result = result.replace(regex, '<mark class="bg-emerald-100 text-emerald-800 px-1 rounded font-bold border-b-2 border-emerald-400">$1</mark>');
    });
    
    return result;
}

/**
 * Çoklu arama terimleri için Türkçe karakter uyumlu arama
 * @param {string} text - Aranacak metin
 * @param {string[]} searchTerms - Arama terimleri dizisi
 * @returns {boolean} - Herhangi bir terimle eşleşme durumu
 */
export function turkishMultiSearch(text, searchTerms) {
    if (!text || !searchTerms || searchTerms.length === 0) return false;
    
    return searchTerms.some(term => turkishIncludes(text, term));
}

/**
 * Kelime sıklığını hesaplar (Türkçe karakter uyumlu)
 * @param {string} text - Analiz edilecek metin
 * @param {string} searchTerm - Aranacak terim
 * @returns {number} - Kelime sıklığı
 */
export function calculateTurkishWordFrequency(text, searchTerm) {
    if (!text || !searchTerm) return 0;
    
    const normalizedText = normalizeTurkishText(text.toLowerCase());
    const normalizedSearchTerm = normalizeTurkishText(searchTerm.toLowerCase());
    
    const words = normalizedText.split(/\s+/);
    const searchWords = normalizedSearchTerm.split(/\s+/);
    
    let frequency = 0;
    
    searchWords.forEach(searchWord => {
        words.forEach(word => {
            if (word.includes(searchWord)) {
                frequency++;
            }
        });
    });
    
    return frequency;
}

/**
 * Test fonksiyonu - Türkçe arama fonksiyonlarını test eder
 */
export function testTurkishSearch() {
    console.log('=== Türkçe Arama Test ===');
    
    const testCases = [
        { text: 'füyûzât', search: 'fuyuzat', expected: true },
        { text: 'rabıta', search: 'rabita', expected: true },
        { text: 'zîkir', search: 'zikir', expected: true },
        { text: 'mürid', search: 'murid', expected: true },
        { text: 'sôhbet', search: 'sohbet', expected: true }
    ];
    
    testCases.forEach(({ text, search, expected }, index) => {
        const result = turkishIncludes(text, search);
        console.log(`Test ${index + 1}: "${text}" includes "${search}" = ${result} (expected: ${expected})`);
        console.log(`  Normalized: "${normalizeTurkishText(text)}" includes "${normalizeTurkishText(search)}"`);
    });
    
    console.log('=== Test Tamamlandı ===');
}