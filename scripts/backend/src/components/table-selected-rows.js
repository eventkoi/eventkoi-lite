import { __, _n, sprintf } from "@wordpress/i18n";

export function TableSelectedRows(props) {
  const { table, compact, totalCountOverride } = props;
  const formatNumber = (value) => Number(value || 0).toLocaleString();

  const selectedCount = table.getFilteredSelectedRowModel().rows.length;
  const visibleCount = table.getRowModel().rows.length;
  const totalCount =
    typeof totalCountOverride === "number"
      ? totalCountOverride
      : table.getFilteredRowModel().rows.length;
  const selectedCountLabel = formatNumber(selectedCount);
  const visibleCountLabel = formatNumber(visibleCount);
  const totalCountLabel = formatNumber(totalCount);

  const hasGlobalTotal = totalCount !== visibleCount;

  const detailedMessage = hasGlobalTotal
    ? sprintf(
        __(
          /* translators: 1: number of selected rows, 2: number of visible rows, 3: total rows */
          "%1$s out of %2$s selected · %3$s total",
          "eventkoi-lite"
        ),
        selectedCountLabel,
        visibleCountLabel,
        totalCountLabel
      )
    : sprintf(
        _n(
          /* translators: 1: number of selected rows, 2: total rows */
          "%1$s out of %2$s row selected.",
          "%1$s out of %2$s rows selected.",
          selectedCount,
          "eventkoi-lite"
        ),
        selectedCountLabel,
        totalCountLabel
      );

  const compactMessage = hasGlobalTotal
    ? sprintf(
        __(
          /* translators: 1: number of selected rows, 2: number of visible rows, 3: total rows */
          "%1$s out of %2$s selected · %3$s total",
          "eventkoi-lite"
        ),
        selectedCountLabel,
        visibleCountLabel,
        totalCountLabel
      )
    : sprintf(
        __(
          /* translators: 1: number of selected rows, 2: total rows */
          "%1$s out of %2$s selected.",
          "eventkoi-lite"
        ),
        selectedCountLabel,
        totalCountLabel
      );

  return <>{compact ? compactMessage : detailedMessage}</>;
}
