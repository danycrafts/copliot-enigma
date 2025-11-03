import '@mui/material/TableCell';

declare module '@mui/material/TableCell' {
  interface TableCellProps {
    colSpan?: number;
  }
}
