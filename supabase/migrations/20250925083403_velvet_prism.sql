/*
# Seed Data for Noahhtrains Fitness App

This migration adds sample data for testing and demonstration:
- Admin user (Noah)
- Sample client
- Exercise database
- Sample programs
- Demo nutrition and workout logs
*/

-- Insert sample exercises
INSERT INTO exercises (id, name, description, instructions, muscle_groups, equipment, categories) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'Barbell Back Squat', 'The king of all exercises for lower body strength', 'Stand with feet shoulder-width apart. Keep chest up and core tight. Descend until thighs are parallel to floor.', ARRAY['quadriceps', 'glutes', 'hamstrings'], ARRAY['barbell', 'squat rack'], ARRAY['strength', 'legs']),
  ('550e8400-e29b-41d4-a716-446655440002', 'Bench Press', 'Classic upper body compound movement', 'Lie on bench with eyes under the bar. Lower bar to chest with control, press back up explosively.', ARRAY['chest', 'triceps', 'shoulders'], ARRAY['barbell', 'bench'], ARRAY['strength', 'chest']),
  ('550e8400-e29b-41d4-a716-446655440003', 'Deadlift', 'Full body strength builder', 'Feet hip-width apart, grip bar just outside legs. Keep back straight, drive through heels.', ARRAY['hamstrings', 'glutes', 'erector spinae', 'traps'], ARRAY['barbell'], ARRAY['strength', 'back']),
  ('550e8400-e29b-41d4-a716-446655440004', 'Pull-ups', 'Bodyweight back builder', 'Hang from bar with arms extended. Pull body up until chin clears bar.', ARRAY['latissimus dorsi', 'biceps', 'rhomboids'], ARRAY['pull-up bar'], ARRAY['bodyweight', 'back']),
  ('550e8400-e29b-41d4-a716-446655440005', 'Push-ups', 'Classic bodyweight chest exercise', 'Start in plank position. Lower chest to ground, push back up.', ARRAY['chest', 'triceps', 'shoulders'], ARRAY['none'], ARRAY['bodyweight', 'chest']),
  ('550e8400-e29b-41d4-a716-446655440006', 'Dumbbell Rows', 'Unilateral back strengthener', 'Hinge at hips with dumbbell in one hand. Pull weight to hip, control the descent.', ARRAY['latissimus dorsi', 'rhomboids', 'biceps'], ARRAY['dumbbell', 'bench'], ARRAY['strength', 'back']),
  ('550e8400-e29b-41d4-a716-446655440007', 'Overhead Press', 'Vertical pushing movement', 'Stand with feet hip-width. Press weight from shoulders directly overhead.', ARRAY['shoulders', 'triceps', 'core'], ARRAY['barbell', 'dumbbells'], ARRAY['strength', 'shoulders']),
  ('550e8400-e29b-41d4-a716-446655440008', 'Romanian Deadlift', 'Hip hinge pattern for posterior chain', 'Hold bar at hip level. Hinge at hips, lower bar along legs, return to standing.', ARRAY['hamstrings', 'glutes'], ARRAY['barbell', 'dumbbells'], ARRAY['strength', 'legs']),
  ('550e8400-e29b-41d4-a716-446655440009', 'Plank', 'Core stability exercise', 'Hold push-up position with forearms on ground. Maintain straight line from head to heels.', ARRAY['core', 'shoulders'], ARRAY['none'], ARRAY['bodyweight', 'core']),
  ('550e8400-e29b-41d4-a716-446655440010', 'Lunges', 'Unilateral leg strengthener', 'Step forward into lunge position. Keep front knee over ankle, return to standing.', ARRAY['quadriceps', 'glutes', 'hamstrings'], ARRAY['dumbbells', 'none'], ARRAY['bodyweight', 'legs']);

-- Insert sample videos
INSERT INTO videos (id, title, description, category, tags, storage_path, is_public) VALUES
  ('660e8400-e29b-41d4-a716-446655440001', 'Proper Squat Form', 'Learn the fundamentals of squatting safely and effectively', 'Form Correction', ARRAY['squat', 'form', 'legs'], 'videos/squat-form.mp4', true),
  ('660e8400-e29b-41d4-a716-446655440002', 'Healthy Meal Prep Basics', 'Simple strategies for preparing nutritious meals ahead of time', 'Cooking', ARRAY['meal prep', 'nutrition', 'cooking'], 'videos/meal-prep-basics.mp4', true),
  ('660e8400-e29b-41d4-a716-446655440003', 'Dynamic Warm-up Routine', 'Full body warm-up to prepare for training', 'Warmup', ARRAY['warmup', 'mobility', 'movement'], 'videos/dynamic-warmup.mp4', true);

-- Insert sample documents
INSERT INTO documents (id, title, description, category, tags, storage_path, file_type, is_public) VALUES
  ('770e8400-e29b-41d4-a716-446655440001', 'Beginner Training Program', 'Complete 12-week program for fitness newcomers', 'Programs', ARRAY['beginner', 'program', 'strength'], 'docs/beginner-program.pdf', 'pdf', true),
  ('770e8400-e29b-41d4-a716-446655440002', 'Nutritional Guidelines', 'Comprehensive guide to healthy eating habits', 'Food Guidance', ARRAY['nutrition', 'diet', 'health'], 'docs/nutrition-guide.pdf', 'pdf', true),
  ('770e8400-e29b-41d4-a716-446655440003', 'Supplement Recommendations', 'Evidence-based supplement guidance', 'Supplements', ARRAY['supplements', 'health', 'performance'], 'docs/supplement-guide.pdf', 'pdf', true);

-- Note: Actual user data will be created through the authentication flow
-- The above provides the foundational content that all users can access