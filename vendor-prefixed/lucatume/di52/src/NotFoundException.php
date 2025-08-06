<?php
/**
 * An exception used to signal no binding was found for container ID.
 *
 * @package lucatume\DI52
 */

namespace EKLIB\lucatume\DI52;

use EKLIB\Psr\Container\NotFoundExceptionInterface;

/**
 * Class NotFoundException
 *
 * @package lucatume\DI52
 */
class NotFoundException extends ContainerException implements NotFoundExceptionInterface
{
}
