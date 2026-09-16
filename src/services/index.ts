import { isSupabaseConfigured } from '@/lib/appMode'

import { demoAuthService } from './demo/demoAuthService'
import { demoProfileService } from './demo/demoProfileService'
import { demoMealsService } from './demo/demoMealsService'
import { demoLogsService } from './demo/demoLogsService'
import { demoPlanService } from './demo/demoPlanService'
import { demoFavoritesService } from './demo/demoFavoritesService'
import { demoExportService } from './demo/demoExportService'

import { supabaseAuthService } from './supabase/supabaseAuthService'
import { supabaseProfileService } from './supabase/supabaseProfileService'
import { supabaseMealsService } from './supabase/supabaseMealsService'
import { supabaseLogsService } from './supabase/supabaseLogsService'
import { supabasePlanService } from './supabase/supabasePlanService'
import { supabaseFavoritesService } from './supabase/supabaseFavoritesService'
import { supabaseExportService } from './supabase/supabaseExportService'

import { demoFoodCatalogService } from './foods/demoFoodCatalogService'
import { supabaseFoodCatalogService } from './foods/supabaseFoodCatalogService'

export const isDemoMode = !isSupabaseConfigured

export const authService = isDemoMode ? demoAuthService : supabaseAuthService
export const profileService = isDemoMode ? demoProfileService : supabaseProfileService
export const mealsService = isDemoMode ? demoMealsService : supabaseMealsService
export const logsService = isDemoMode ? demoLogsService : supabaseLogsService
export const planService = isDemoMode ? demoPlanService : supabasePlanService
export const favoritesService = isDemoMode ? demoFavoritesService : supabaseFavoritesService
export const exportService = isDemoMode ? demoExportService : supabaseExportService
export const foodCatalogService = isDemoMode ? demoFoodCatalogService : supabaseFoodCatalogService
