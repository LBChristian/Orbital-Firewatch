/**
 * Physical constants and Earth model used by the educational simulation.
 * One module, documented in docs/SCIENTIFIC_ASSUMPTIONS.md.
 *
 * Units: km, s, rad unless stated otherwise.
 */

/** Mean Earth radius (km). Spherical Earth model (IUGG mean radius R1). */
export const EARTH_RADIUS_KM = 6371.0088;

/** Earth's standard gravitational parameter GM (km^3 / s^2). */
export const MU_EARTH_KM3_S2 = 398600.4418;

/** Earth's sidereal rotation rate (rad / s). */
export const EARTH_ROTATION_RAD_S = 7.2921159e-5;

export const DEG = Math.PI / 180;
export const RAD = 180 / Math.PI;
export const TWO_PI = Math.PI * 2;

/** Decimal megabyte: 1 MB = 1,000,000 bytes = 8,000,000 bits. Mbps * s / 8 = MB. */
export const BITS_PER_MB = 8_000_000;
