const ones = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen"
];

const tens = [
  "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"
];

const scales = ["", "Thousand", "Million", "Billion", "Trillion"];

function convertHundreds(num: number): string {
  let result = "";
  
  if (num >= 100) {
    result += ones[Math.floor(num / 100)] + " Hundred";
    num %= 100;
    if (num > 0) result += " ";
  }
  
  if (num >= 20) {
    result += tens[Math.floor(num / 10)];
    num %= 10;
    if (num > 0) result += " " + ones[num];
  } else if (num > 0) {
    result += ones[num];
  }
  
  return result;
}

export function numberToWords(amount: number): string {
  if (amount === 0) return "Zero Dirhams Only";
  
  const isNegative = amount < 0;
  amount = Math.abs(amount);
  
  const dirhams = Math.floor(amount);
  const fils = Math.round((amount - dirhams) * 100);
  
  let result = "";
  
  if (dirhams === 0) {
    result = "Zero";
  } else {
    let num = dirhams;
    let scaleIndex = 0;
    const parts: string[] = [];
    
    while (num > 0) {
      const chunk = num % 1000;
      if (chunk > 0) {
        const chunkWords = convertHundreds(chunk);
        if (scales[scaleIndex]) {
          parts.unshift(chunkWords + " " + scales[scaleIndex]);
        } else {
          parts.unshift(chunkWords);
        }
      }
      num = Math.floor(num / 1000);
      scaleIndex++;
    }
    
    result = parts.join(" ");
  }
  
  result += dirhams === 1 ? " Dirham" : " Dirhams";
  
  if (fils > 0) {
    result += " and " + convertHundreds(fils);
    result += fils === 1 ? " Fil" : " Fils";
  }
  
  result += " Only";
  
  if (isNegative) {
    result = "Negative " + result;
  }
  
  return result;
}
