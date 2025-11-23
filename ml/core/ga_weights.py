"""Genetic Algorithm for optimizing strategy signal weights."""

import random
from typing import Dict, List, Callable, Tuple
import numpy as np


class GeneticWeightOptimizer:
    """Optimize signal weights using genetic algorithm."""

    def __init__(
        self,
        signal_names: List[str],
        fitness_function: Callable[[Dict[str, float]], float],
        population_size: int = 50,
        generations: int = 100,
        mutation_rate: float = 0.1,
        crossover_rate: float = 0.7,
        elitism: int = 5
    ):
        """
        Initialize GA optimizer.

        Args:
            signal_names: List of signal names to optimize weights for
            fitness_function: Function that takes weights dict and returns fitness score
            population_size: Number of individuals per generation
            generations: Number of generations to evolve
            mutation_rate: Probability of mutation
            crossover_rate: Probability of crossover
            elitism: Number of top individuals to preserve
        """
        self.signal_names = signal_names
        self.fitness_function = fitness_function
        self.population_size = population_size
        self.generations = generations
        self.mutation_rate = mutation_rate
        self.crossover_rate = crossover_rate
        self.elitism = elitism

        self.population: List[np.ndarray] = []
        self.best_individual: np.ndarray = None
        self.best_fitness: float = -np.inf
        self.fitness_history: List[float] = []

    def _create_individual(self) -> np.ndarray:
        """Create random individual with normalized weights."""
        weights = np.random.random(len(self.signal_names))
        return weights / weights.sum()  # Normalize to sum to 1

    def _initialize_population(self):
        """Initialize random population."""
        self.population = [self._create_individual() for _ in range(self.population_size)]

    def _evaluate_fitness(self, individual: np.ndarray) -> float:
        """Evaluate fitness of individual."""
        weights_dict = dict(zip(self.signal_names, individual.tolist()))
        return self.fitness_function(weights_dict)

    def _select_parents(self, fitnesses: List[float]) -> Tuple[np.ndarray, np.ndarray]:
        """Tournament selection."""
        tournament_size = 3

        def tournament():
            indices = random.sample(range(len(self.population)), tournament_size)
            tournament_fitnesses = [fitnesses[i] for i in indices]
            winner_idx = indices[np.argmax(tournament_fitnesses)]
            return self.population[winner_idx].copy()

        parent1 = tournament()
        parent2 = tournament()
        return parent1, parent2

    def _crossover(self, parent1: np.ndarray, parent2: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """Single-point crossover."""
        if random.random() < self.crossover_rate:
            point = random.randint(1, len(parent1) - 1)
            child1 = np.concatenate([parent1[:point], parent2[point:]])
            child2 = np.concatenate([parent2[:point], parent1[point:]])

            # Re-normalize
            child1 = child1 / child1.sum()
            child2 = child2 / child2.sum()

            return child1, child2
        else:
            return parent1.copy(), parent2.copy()

    def _mutate(self, individual: np.ndarray) -> np.ndarray:
        """Gaussian mutation with re-normalization."""
        if random.random() < self.mutation_rate:
            mutation = np.random.normal(0, 0.1, len(individual))
            individual = individual + mutation
            individual = np.abs(individual)  # Ensure positive
            individual = individual / individual.sum()  # Re-normalize

        return individual

    def optimize(self) -> Dict[str, float]:
        """
        Run genetic algorithm optimization.

        Returns:
            Dictionary of optimized signal weights
        """
        self._initialize_population()

        for generation in range(self.generations):
            # Evaluate fitness
            fitnesses = [self._evaluate_fitness(ind) for ind in self.population]

            # Track best
            gen_best_idx = np.argmax(fitnesses)
            gen_best_fitness = fitnesses[gen_best_idx]

            if gen_best_fitness > self.best_fitness:
                self.best_fitness = gen_best_fitness
                self.best_individual = self.population[gen_best_idx].copy()

            self.fitness_history.append(self.best_fitness)

            # Elitism: preserve top individuals
            elite_indices = np.argsort(fitnesses)[-self.elitism:]
            elite = [self.population[i].copy() for i in elite_indices]

            # Create new population
            new_population = elite.copy()

            while len(new_population) < self.population_size:
                parent1, parent2 = self._select_parents(fitnesses)
                child1, child2 = self._crossover(parent1, parent2)
                child1 = self._mutate(child1)
                child2 = self._mutate(child2)

                new_population.append(child1)
                if len(new_population) < self.population_size:
                    new_population.append(child2)

            self.population = new_population[:self.population_size]

        # Return best weights as dictionary
        return dict(zip(self.signal_names, self.best_individual.tolist()))

    def get_convergence_history(self) -> List[float]:
        """Get fitness history across generations."""
        return self.fitness_history


def optimize_strategy_weights(
    signal_names: List[str],
    backtest_function: Callable[[Dict[str, float]], Dict[str, float]],
    objective: str = "sharpe",
    constraints: Dict[str, float] = None,
    **ga_params
) -> Dict[str, float]:
    """
    Optimize strategy weights using GA.

    Args:
        signal_names: List of signal names
        backtest_function: Function that takes weights and returns backtest metrics
        objective: Objective metric to maximize ("sharpe", "return", "win_rate")
        constraints: Optional constraints (e.g., {"max_drawdown": -0.2, "min_win_rate": 0.5})
        **ga_params: Additional GA parameters

    Returns:
        Optimized weights dictionary
    """
    if constraints is None:
        constraints = {}

    def fitness_function(weights: Dict[str, float]) -> float:
        """Fitness function with constraints."""
        results = backtest_function(weights)

        # Check constraints
        if "max_drawdown" in constraints:
            if results.get("max_drawdown", 0) < constraints["max_drawdown"]:
                return -1000  # Penalty

        if "min_win_rate" in constraints:
            if results.get("win_rate", 0) < constraints["min_win_rate"]:
                return -1000  # Penalty

        # Return objective
        if objective == "sharpe":
            return results.get("sharpe_ratio", 0)
        elif objective == "return":
            return results.get("total_return", 0)
        elif objective == "win_rate":
            return results.get("win_rate", 0)
        else:
            return results.get(objective, 0)

    optimizer = GeneticWeightOptimizer(
        signal_names=signal_names,
        fitness_function=fitness_function,
        **ga_params
    )

    return optimizer.optimize()
