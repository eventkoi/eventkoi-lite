<?php
/**
 * Event template.
 *
 * You can override this template in your theme by copying it to:
 *   yourtheme/eventkoi/event.php
 *
 * @package EventKoi
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
?>
<!-- wp:group {"className":"eventkoi-front eventkoi-legacy","style":{"spacing":{"margin":{"top":"40px","bottom":"40px"},"blockGap":"30px","padding":{"right":"0","left":"0"}}},"layout":{"type":"constrained","wideSize":"1100px","contentSize":"1100px"}} -->
<div class="wp-block-group eventkoi-front eventkoi-legacy" style="margin-top:40px;margin-bottom:40px;padding-right:0;padding-left:0"><!-- wp:columns {"style":{"spacing":{"blockGap":{"top":"0","left":"var:preset|spacing|30"}}}} -->
<div class="wp-block-columns"><!-- wp:column {"width":"65%","style":{"spacing":{"blockGap":"0","padding":{"top":"0","bottom":"0"}}}} -->
<div class="wp-block-column" style="padding-top:0;padding-bottom:0;flex-basis:65%"><!-- wp:paragraph -->
<p>← See all events in event_calendar_link</p>
<!-- /wp:paragraph -->

<!-- wp:heading {"level":1,"metadata":{"bindings":{"content":{"source":"core/post-meta","args":{"key":"event_title"}}}},"style":{"typography":{"fontStyle":"normal","fontWeight":"600"},"color":{"text":"#333333"},"elements":{"link":{"color":{"text":"#333333"}}},"spacing":{"margin":{"top":"0","bottom":"0","left":"0","right":"0"}}},"fontFamily":"body"} -->
<h1 class="wp-block-heading has-text-color has-link-color has-body-font-family" style="color:#333333;margin-top:0;margin-right:0;margin-bottom:0;margin-left:0;font-style:normal;font-weight:600"></h1>
<!-- /wp:heading --></div>
<!-- /wp:column -->

<!-- wp:column {"width":"35%"} -->
<div class="wp-block-column" style="flex-basis:35%"><!-- wp:buttons {"layout":{"type":"flex","justifyContent":"right","flexWrap":"wrap"}} -->
<div class="wp-block-buttons"><!-- wp:button {"backgroundColor":"base-2","textColor":"contrast-2","className":"is-style-outline","style":{"border":{"radius":"10px","color":"#dcdcdc","width":"1px"},"spacing":{"padding":{"left":"20px","right":"20px","top":"10px","bottom":"10px"}},"elements":{"link":{"color":{"text":"var:preset|color|contrast-2"}}}},"fontSize":"small"} -->
<div class="wp-block-button is-style-outline"><a class="wp-block-button__link has-contrast-2-color has-base-2-background-color has-text-color has-background has-link-color has-border-color has-small-font-size has-custom-font-size wp-element-button" href="#add-to-cal" style="border-color:#dcdcdc;border-width:1px;border-radius:10px;padding-top:10px;padding-right:20px;padding-bottom:10px;padding-left:20px">+ Add to calendar</a></div>
<!-- /wp:button -->

<!-- wp:button {"backgroundColor":"base-2","textColor":"contrast-2","className":"is-style-outline","style":{"border":{"radius":"10px","color":"#dcdcdc","width":"1px"},"spacing":{"padding":{"left":"20px","right":"20px","top":"10px","bottom":"10px"}},"elements":{"link":{"color":{"text":"var:preset|color|contrast-2"}}}},"fontSize":"small"} -->
<div class="wp-block-button is-style-outline"><a class="wp-block-button__link has-contrast-2-color has-base-2-background-color has-text-color has-background has-link-color has-border-color has-small-font-size has-custom-font-size wp-element-button" href="#event-share" style="border-color:#dcdcdc;border-width:1px;border-radius:10px;padding-top:10px;padding-right:20px;padding-bottom:10px;padding-left:20px"><img class="wp-image-10184" style="width: 13px;" src="<?php echo esc_url( eventkoi_get_template_asset( 'share.png' ) ); ?>" alt=""> Share</a></div>
<!-- /wp:button --></div>
<!-- /wp:buttons --></div>
<!-- /wp:column --></div>
<!-- /wp:columns -->

<!-- wp:columns {"style":{"spacing":{"blockGap":{"left":"30px"}}}} -->
<div class="wp-block-columns"><!-- wp:column {"width":"65%","style":{"spacing":{"blockGap":"10px"}}} -->
<div class="wp-block-column" style="flex-basis:65%"><!-- wp:image {"sizeSlug":"large","metadata":{"bindings":{"url":{"source":"core/post-meta","args":{"key":"event_image_url"}}}},"style":{"border":{"radius":"20px"}}} -->
<figure class="wp-block-image size-large has-custom-border"><img alt="" style="border-radius:20px"/></figure>
<!-- /wp:image -->

<!-- wp:paragraph {"metadata":{"bindings":{"content":{"source":"core/post-meta","args":{"key":"event_details"}}}}} -->
<p></p>
<!-- /wp:paragraph --></div>
<!-- /wp:column -->

<!-- wp:column {"width":"35%","style":{"spacing":{"blockGap":"30px"}}} -->
<div class="wp-block-column" style="flex-basis:35%"><!-- wp:group {"style":{"spacing":{"padding":{"top":"30px","bottom":"30px","left":"30px","right":"30px"},"blockGap":"30px","margin":{"top":"0","bottom":"0"}},"border":{"color":"#eeeeee","width":"1px","radius":"10px"},"color":{"background":"#f3f3f3"}},"layout":{"type":"constrained"}} -->
<div class="wp-block-group has-border-color has-background" style="border-color:#eeeeee;border-width:1px;border-radius:10px;background-color:#f3f3f3;margin-top:0;margin-bottom:0;padding-top:30px;padding-right:30px;padding-bottom:30px;padding-left:30px"><!-- wp:columns {"isStackedOnMobile":false,"style":{"spacing":{"blockGap":{"top":"0","left":"20px"}}}} -->
<div class="wp-block-columns is-not-stacked-on-mobile"><!-- wp:column {"width":"20px"} -->
<div class="wp-block-column" style="flex-basis:20px"><!-- wp:image {"id":10155,"width":"20px","sizeSlug":"full","linkDestination":"none"} -->
<figure class="wp-block-image size-full is-resized"><img src="<?php echo esc_url( eventkoi_get_template_asset( 'date.png' ) ); ?>" alt="" class="wp-image-10155" style="width:20px"/></figure>
<!-- /wp:image --></div>
<!-- /wp:column -->

<!-- wp:column {"style":{"spacing":{"blockGap":"0"}}} -->
<div class="wp-block-column"><!-- wp:paragraph {"metadata":{"bindings":{"content":{"source":"core/post-meta","args":{"key":"event_datetime_with_summary"}}}}} -->
<p></p>
<!-- /wp:paragraph -->

<!-- wp:paragraph {"metadata":{"bindings":{"content":{"source":"core/post-meta","args":{"key":"event_timezone"}}}},"style":{"elements":{"link":{"color":{"text":"#999999"}}},"color":{"text":"#999999"}}} -->
<p class="has-text-color has-link-color" style="color:#999999"></p>
<!-- /wp:paragraph --></div>
<!-- /wp:column --></div>
<!-- /wp:columns -->

<!-- wp:columns {"isStackedOnMobile":false,"style":{"spacing":{"blockGap":{"top":"0px","left":"20px"},"padding":{"top":"0","bottom":"0"}}}} -->
<div class="wp-block-columns is-not-stacked-on-mobile" style="padding-top:0;padding-bottom:0"><!-- wp:column {"width":"20px"} -->
<div class="wp-block-column" style="flex-basis:20px"><!-- wp:image {"id":10160,"width":"20px","sizeSlug":"full","linkDestination":"none"} -->
<figure class="wp-block-image size-full is-resized"><img src="<?php echo esc_url( eventkoi_get_template_asset( 'pin.png' ) ); ?>" alt="" class="wp-image-10160" style="width:20px"/></figure>
<!-- /wp:image --></div>
<!-- /wp:column -->

<!-- wp:column {"style":{"spacing":{"blockGap":"0"}}} -->
<div class="wp-block-column"><!-- wp:paragraph {"metadata":{"bindings":{"content":{"source":"core/post-meta","args":{"key":"event_location"}}}}} -->
<p></p>
<!-- /wp:paragraph --></div>
<!-- /wp:column --></div>
<!-- /wp:columns --></div>
<!-- /wp:group -->

<!-- wp:paragraph {"metadata":{"bindings":{"content":{"source":"core/post-meta","args":{"key":"event_gmap"}}}}} -->
<p></p>
<!-- /wp:paragraph --></div>
<!-- /wp:column --></div>
<!-- /wp:columns --></div>
<!-- /wp:group -->
