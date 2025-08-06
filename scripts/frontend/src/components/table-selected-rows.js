export function TableSelectedRows(props) {
  const { table, compact } = props;

  return (
    <>
      {table.getFilteredSelectedRowModel().rows.length} of{" "}
      {table.getFilteredRowModel().rows.length} {!compact && `row(s)`} selected.
    </>
  );
}
