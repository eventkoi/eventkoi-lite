<?php
/**
 * Displays a single event.
 *
 * @package EventKoi
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
?>
<!-- wp:template-part {"slug":"header","theme":"twentytwentyfive"} /-->

<!-- wp:group {"className":"eventkoi-front","style":{"spacing":{"margin":{"top":"40px","bottom":"40px"},"blockGap":"30px","padding":{"right":"30px","left":"30px"}}},"layout":{"type":"constrained","wideSize":"1100px","contentSize":"1100px"}} -->
<div class="wp-block-group eventkoi-front" style="margin-top:40px;margin-bottom:40px;padding-right:30px;padding-left:30px">

<!-- wp:paragraph -->
<p>← See all events in event_calendar_link</p>
<!-- /wp:paragraph -->
 
<!-- wp:heading -->
<h2 class="wp-block-heading">Series: event_title</h2>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>Starts on event_datetime<br>Runs event_rulesummary</p>
<!-- /wp:paragraph -->
 
<!-- wp:buttons {"layout":{"type":"flex","flexWrap":"wrap"}} -->
<div class="wp-block-buttons">
<!-- wp:button {"backgroundColor":"base-2","textColor":"contrast-2","className":"is-style-outline","style":{"border":{"radius":"10px","color":"#dcdcdc","width":"1px"},"spacing":{"padding":{"left":"20px","right":"20px","top":"10px","bottom":"10px"}},"elements":{"link":{"color":{"text":"var:preset|color|contrast-2"}}}},"fontSize":"small"} -->
<div class="wp-block-button is-style-outline"><a class="wp-block-button__link has-contrast-2-color has-base-2-background-color has-text-color has-background has-link-color has-border-color has-small-font-size has-custom-font-size wp-element-button" href="#add-to-cal" style="border-color:#dcdcdc;border-width:1px;border-radius:10px;padding-top:10px;padding-right:20px;padding-bottom:10px;padding-left:20px">+ Add to calendar</a></div>
<!-- /wp:button -->
<!-- wp:button {"backgroundColor":"base-2","textColor":"contrast-2","className":"is-style-outline","style":{"border":{"radius":"10px","color":"#dcdcdc","width":"1px"},"spacing":{"padding":{"left":"20px","right":"20px","top":"10px","bottom":"10px"}},"elements":{"link":{"color":{"text":"var:preset|color|contrast-2"}}}},"fontSize":"small"} -->
<div class="wp-block-button is-style-outline"><a class="wp-block-button__link has-contrast-2-color has-base-2-background-color has-text-color has-background has-link-color has-border-color has-small-font-size has-custom-font-size wp-element-button" href="#event-share" style="border-color:#dcdcdc;border-width:1px;border-radius:10px;padding-top:10px;padding-right:20px;padding-bottom:10px;padding-left:20px"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" style="vertical-align:-1px"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="8.59" y1="10.49" x2="15.42" y2="6.51"/></svg> Share</a></div>
<!-- /wp:button --></div>
<!-- /wp:buttons -->

<!-- wp:paragraph {"metadata":{"bindings":{"content":{"source":"core/post-meta","args":{"key":"event_details"}}}}} -->
<p></p>
<!-- /wp:paragraph -->

<!-- wp:query {"queryId":197,"query":{"perPage":6,"pages":0,"offset":0,"postType":"eventkoi_event","order":"asc","orderBy":"start_date","author":"","search":"","sticky":"","inherit":false,"eventkoiSig":"|||1|1|0|asc|start_date|6|1"},"namespace":"eventkoi/event-query-loop","includeInstances":true,"showInstancesForEvent":true,"instanceParentId":0,"className":"eventkoi-query-loop","listLayoutStyle":"image-left"} -->
<div class="wp-block-query eventkoi-query-loop"><!-- wp:post-template {"layout":{"type":"default"}} -->
<!-- wp:eventkoi/event-query-item -->
<!-- wp:group {"className":"eventkoi-event-loop-card","layout":{"type":"default"}} -->
<div class="wp-block-group eventkoi-event-loop-card"><!-- wp:columns -->
<div class="wp-block-columns"><!-- wp:column {"width":"30%"} -->
<div class="wp-block-column" style="flex-basis:30%"><!-- wp:post-featured-image {"className":"eventkoi-event-image-default"} /--></div>
<!-- /wp:column -->
<!-- wp:column {"width":"70%"} -->
<div class="wp-block-column" style="flex-basis:70%"><!-- wp:eventkoi/event-data {"className":"ek-event-title-default"} /-->
<!-- wp:eventkoi/event-data {"field":"timeline","className":"ek-event-timeline-default"} /-->
<!-- wp:eventkoi/event-data {"field":"excerpt"} /-->
<!-- wp:eventkoi/event-data {"field":"location","className":"ek-event-location-default"} /--></div>
<!-- /wp:column --></div>
<!-- /wp:columns --></div>
<!-- /wp:group -->
<!-- /wp:eventkoi/event-query-item -->
<!-- /wp:post-template -->
<!-- wp:query-pagination {"paginationArrow":"arrow","layout":{"type":"flex","justifyContent":"space-between"}} -->
<!-- wp:query-pagination-previous {"label":"Previous"} /-->
<!-- wp:query-pagination-numbers /-->
<!-- wp:query-pagination-next {"label":"Next"} /-->
<!-- /wp:query-pagination -->
<!-- wp:query-no-results -->
<!-- wp:paragraph {"placeholder":"No events found."} -->
<p></p>
<!-- /wp:paragraph -->
<!-- /wp:query-no-results --></div>
<!-- /wp:query -->

</div>
<!-- /wp:group -->

<!-- wp:template-part {"slug":"footer","theme":"twentytwentyfive"} /-->
