export function TablePage(props) {
  const { table } = props;

  return (
    <div className="flex items-center text-sm">
      Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
    </div>
  );
}
