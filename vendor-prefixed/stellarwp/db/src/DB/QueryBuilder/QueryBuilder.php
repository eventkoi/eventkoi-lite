<?php

namespace EKLIB\StellarWP\DB\QueryBuilder;

use EKLIB\StellarWP\DB\QueryBuilder\Concerns\Aggregate;
use EKLIB\StellarWP\DB\QueryBuilder\Concerns\CRUD;
use EKLIB\StellarWP\DB\QueryBuilder\Concerns\FromClause;
use EKLIB\StellarWP\DB\QueryBuilder\Concerns\GroupByStatement;
use EKLIB\StellarWP\DB\QueryBuilder\Concerns\HavingClause;
use EKLIB\StellarWP\DB\QueryBuilder\Concerns\JoinClause;
use EKLIB\StellarWP\DB\QueryBuilder\Concerns\LimitStatement;
use EKLIB\StellarWP\DB\QueryBuilder\Concerns\MetaQuery;
use EKLIB\StellarWP\DB\QueryBuilder\Concerns\OffsetStatement;
use EKLIB\StellarWP\DB\QueryBuilder\Concerns\OrderByStatement;
use EKLIB\StellarWP\DB\QueryBuilder\Concerns\SelectStatement;
use EKLIB\StellarWP\DB\QueryBuilder\Concerns\TablePrefix;
use EKLIB\StellarWP\DB\QueryBuilder\Concerns\UnionOperator;
use EKLIB\StellarWP\DB\QueryBuilder\Concerns\WhereClause;

/**
 * @since 1.0.0
 */
class QueryBuilder {
	use Aggregate;
	use CRUD;
	use FromClause;
	use GroupByStatement;
	use HavingClause;
	use JoinClause;
	use LimitStatement;
	use MetaQuery;
	use OffsetStatement;
	use OrderByStatement;
	use SelectStatement;
	use TablePrefix;
	use UnionOperator;
	use WhereClause;

	/**
	 * @return string
	 */
	public function getSQL() {
		$sql = array_merge(
			$this->getSelectSQL(),
			$this->getFromSQL(),
			$this->getJoinSQL(),
			$this->getWhereSQL(),
			$this->getGroupBySQL(),
			$this->getHavingSQL(),
			$this->getOrderBySQL(),
			$this->getLimitSQL(),
			$this->getOffsetSQL(),
			$this->getUnionSQL()
		);

		// Trim double spaces added by DB::prepare
		return str_replace(
			[ '   ', '  ' ],
			' ',
			implode( ' ', $sql )
		);
	}
}
