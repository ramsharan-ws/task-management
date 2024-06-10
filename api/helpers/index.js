const removeWhitespace = (str) => str.replace(/\s+/g, "");

const cleanRow = (row) => {
  const cleanedRow = {};
  for (const key in row) {
    if (row.hasOwnProperty(key)) {
      const cleanedKey = key.trim();
      const cleanedValue = row[key].trim();
      cleanedRow[cleanedKey] = cleanedValue;
    }
  }
  return cleanedRow;
};

const validateHeaders = (cleanedRow, expectedHeaders) => {
  const headers = Object.keys(cleanedRow);
  const missingHeaders = expectedHeaders.filter(
    (header) => !headers.includes(header)
  );

  return missingHeaders;
};

const formatToFourDecimalPlaces = (number) => {
  // if (typeof number !== "number") {
  //   throw new Error("Input is not a valid number");
  // }
  // Check if the number has decimal places
  // if (number % 1 !== 0) {
  //   return number.toFixed(4);
  // } else {
  //   return number.toString(); // No decimal places, return as is
  // }
  return number;
};

module.exports = {
  cleanRow,
  validateHeaders,
  formatToFourDecimalPlaces,
};
