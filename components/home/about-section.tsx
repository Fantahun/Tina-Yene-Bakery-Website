"use client";

import { Wheat, HandHeart, PartyPopper, Earth } from "lucide-react";

const features = [
	{
		icon: Wheat,
		title: "Premium ingredients, always",
		description:
			"We use high-quality butter, flour, and fresh ingredients in every recipe.",
	},
	{
		icon: HandHeart,
		title: "Handcrafted with precision and care",
		description:
			"Each cake, cookie, and pastry is thoughtfully prepared from start to finish",
	},
	{
		icon: Earth,
		title: "Inspired by culture, made for everyone",
		description:
			"From everyday treats to special occasions, our products are made for everyone.",
	},
	{
		icon: PartyPopper,
		title: "Designed to make every moment special",
		description:
			"We always try to make your moments sweet and special with our delicious cakes and pastries.",
	},
];

export function AboutSection() {
	return (
		<section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
			<div className="mb-12 text-center">
				<h2 className="text-balance text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
					Our Promise
				</h2>
				<p className="mx-auto mt-3 max-w-xl text-pretty text-muted-foreground">
					More than just a bakery, we are a community built on the love of great
					cake and pastries
				</p>
			</div>

			<div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
				{features.map((feature) => {
					const Icon = feature.icon;
					return (
						<div
							key={feature.title}
							className="flex flex-col items-center text-center"
						>
							<div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
								<Icon className="h-6 w-6 text-primary" />
							</div>
							<h3 className="mt-4 text-base font-semibold text-foreground">
								{feature.title}
							</h3>
							<p className="mt-2 text-sm leading-relaxed text-muted-foreground">
								{feature.description}
							</p>
						</div>
					);
				})}
			</div>
		</section>
	);
}
