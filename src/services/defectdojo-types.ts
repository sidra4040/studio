
import { z } from 'zod';

/**
 * @fileOverview This file contains the Zod schemas for validating DefectDojo API responses.
 * These schemas are used across both server and client components.
 */

export const ProductSchema = z.object({
    id: z.number(),
    name: z.string(),
});

export const EngagementSchema = z.object({
    id: z.number(),
    name: z.string(),
    product: z.number(),
});

export const TestTypeSchema = z.object({
    id: z.number(),
    name: z.string(),
});

export const TestObjectSchema = z.object({
    id: z.number(),
    test_type: TestTypeSchema,
    engagement: EngagementSchema,
});

export const FindingSchema = z.object({
    id: z.number(),
    title: z.string(),
    severity: z.string(),
    description: z.string(),
    mitigation: z.string().nullable().optional(),
    active: z.boolean(),
    cwe: z.number().nullable(),
    cve: z.string().nullable().optional(),
    cvssv3_score: z.union([z.string(), z.number()]).nullable(),
    test: TestObjectSchema.optional(), // Make the 'test' object optional to prevent crashes
    found_by: z.array(z.number()),
    date: z.string(), // ISO date string
    component_name: z.string().nullable().optional(),
    component_version: z.string().nullable().optional(),
    product_name: z.string().optional().nullable(),
});
