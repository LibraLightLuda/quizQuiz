export type SudokuConflict = 'row' | 'column' | 'box';

export const sudokuConflicts = (
  grid: readonly number[],
  index: number,
  number: number,
  size: number,
  boxRows: number,
  boxCols: number
): SudokuConflict[] => {
  if (index < 0 || index >= grid.length || number < 1 || number > size) return [];
  const row = Math.floor(index / size);
  const column = index % size;
  const boxRow = Math.floor(row / boxRows) * boxRows;
  const boxColumn = Math.floor(column / boxCols) * boxCols;
  const conflicts: SudokuConflict[] = [];

  if (grid.some((value, cellIndex) => cellIndex !== index && Math.floor(cellIndex / size) === row && value === number)) {
    conflicts.push('row');
  }
  if (grid.some((value, cellIndex) => cellIndex !== index && cellIndex % size === column && value === number)) {
    conflicts.push('column');
  }
  if (grid.some((value, cellIndex) => {
    if (cellIndex === index || value !== number) return false;
    const cellRow = Math.floor(cellIndex / size);
    const cellColumn = cellIndex % size;
    return cellRow >= boxRow && cellRow < boxRow + boxRows
      && cellColumn >= boxColumn && cellColumn < boxColumn + boxCols;
  })) {
    conflicts.push('box');
  }
  return conflicts;
};

export const availableSudokuNumbers = (
  grid: readonly number[],
  index: number,
  size: number,
  boxRows: number,
  boxCols: number
): number[] => Array.from({ length: size }, (_, offset) => offset + 1)
  .filter((number) => sudokuConflicts(grid, index, number, size, boxRows, boxCols).length === 0);

export const conflictMessage = (number: number, conflicts: readonly SudokuConflict[]): string => {
  const labels = conflicts.map((conflict) => ({ row: '가로줄', column: '세로줄', box: '굵은 선 상자' })[conflict]);
  return `숫자 ${number}은(는) 같은 ${labels.join('과 ')}에 이미 있어요.`;
};
