cd backend
yarn build

cd ../frontend
yarn build

cd ..
tar -czf bundle.tar.gz -T distribution_files.txt

mv bundle.tar.gz ~/Documents/WritingAssistant/bundle.tar.gz
