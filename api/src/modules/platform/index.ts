// Public API of the platform module — platform administration: constituencies, their chairmen and
// platform admins (FR-ADM). Every route requires the platform_admin role. Other modules import only this.
export { platformRouter } from './platform_routes';
export { platformService } from './platform_service';
export { newExecutiveSchema } from './platform_schemas';
