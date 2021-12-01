apt update
apt install -y zsh
sh -c "$(curl -fsSL https://raw.github.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"
apt install -y npm
npm install -g n
n stable
zsh
npm install -g @google/clasp
